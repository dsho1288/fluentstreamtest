"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var shelljs_1 = __importDefault(require("shelljs"));
var glob_1 = __importDefault(require("glob"));
var fs_1 = __importDefault(require("fs"));
var dotenv_1 = __importDefault(require("dotenv"));
var event_stream_1 = __importDefault(require("event-stream"));
var body_parser_1 = __importDefault(require("body-parser"));
var node_cron_1 = __importDefault(require("node-cron"));
var pg_1 = require("pg");
var app = express_1.default();
var port = 3000;
var dotConfig = {
    silent: true,
};
// Load env variables which contains my db connection
dotenv_1.default.config(dotConfig);
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// create connection pool
var pool = new pg_1.Pool({
    host: process.env.host,
    port: parseInt(process.env.db_port, 10),
    database: process.env.database,
    user: process.env.username,
    password: process.env.password,
    max: 100,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
app.get("/", function (req, res) {
    res.send("Welcome To Davids Fluentstream Ip Search!");
});
// api to search for flagged ips in my database
app.post("/ip", function (req, res) {
    var ip = req.body.ip;
    console.log(ip, req.body);
    try {
        var query_1 = {
            name: "fetch-data",
            text: "SELECT * FROM ipsets WHERE ipset =$1",
            values: [ip],
        };
        pool.connect(function (err, client, release) { return __awaiter(void 0, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (err) {
                            return [2 /*return*/, console.error("Error acquiring client", err.stack)];
                        }
                        return [4 /*yield*/, client.query(query_1)];
                    case 1:
                        rows = (_a.sent()).rows;
                        // if ip is present return true
                        res.json({ data: rows.length > 0 ? true : false });
                        release();
                        return [2 /*return*/];
                }
            });
        }); });
    }
    catch (err) {
        console.log(err);
    }
});
app.listen(port, function () {
    console.log("Example app listening at http://localhost:" + port);
});
// shell script to pull the iplist repo
setTimeout(function () { return shelljs_1.default.exec("./pull-repo.sh"); }, 1000);
// cron job to update repo with ip, automated part
node_cron_1.default.schedule("0 0 * * *", function () {
    // pull most recent git repo
    shelljs_1.default.exec("./pull.sh");
    // ingest data into db
    importData();
});
// validate ip address
var validIPaddress = function (ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return true;
    }
    return false;
};
// loop through all files in the directory and add valid ips into db
var loopFiles = function (fetchedFiles) {
    console.log("Fetching from repo");
    fetchedFiles.forEach(function (file) {
        var validIps = [];
        var lineNr = 0;
        var s = fs_1.default
            .createReadStream("" + file)
            .pipe(event_stream_1.default.split())
            .pipe(event_stream_1.default
            .mapSync(function (line) {
            // pause the readstream
            if (validIPaddress(line)) {
                validIps.push(line);
            }
            s.pause();
            lineNr += 1;
            // process line here and call s.resume() when rdy
            // function below was for logging memory usage
            // resume the readstream, possibly from a callback
            s.resume();
        })
            .on("error", function (err) {
            console.log("Error while reading file.", err);
        })
            .on("end", function () {
            console.log("Read entire file.");
        }));
        insertIntoDb(validIps);
    });
};
var insertIntoDb = function (data) {
    try {
        var insertQuery_1 = {
            name: "insert-table",
            text: "INSERT INTO ipsets (ipset) VALUES ($1);",
        };
        pool.connect(function (err, client, release) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (err) {
                    return [2 /*return*/, console.error("Error acquiring client", err.stack)];
                }
                data.forEach(function (ips) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        console.log(ips);
                        insertQuery_1.values = [ips];
                        client.query(insertQuery_1)
                            .then(function (res) { return console.log(res); })
                            .catch(function (err) { return console.log(err); });
                        ;
                        return [2 /*return*/];
                    });
                }); });
                release();
                return [2 /*return*/];
            });
        }); });
    }
    catch (err) {
        console.log(err);
    }
};
var buildDb = function () { return __awaiter(void 0, void 0, void 0, function () {
    var query, createTable;
    return __generator(this, function (_a) {
        query = {
            name: "drop-table",
            text: "DROP TABLE IF EXISTS ipsets;",
        };
        createTable = {
            name: "create-table",
            text: "\n            CREATE TABLE IF NOT EXISTS ipsets (\n                id SERIAL PRIMARY KEY,\n                ipset VARCHAR(20) UNIQUE\n            );\n        ",
        };
        try {
            pool.connect(function (err, client, release) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (err) {
                        console.log(err);
                        return [2 /*return*/, console.error("Error acquiring client", err.stack)];
                    }
                    client.query(query)
                        .then(function (res) { return console.log(res); })
                        .catch(function (err) { return console.log(err); });
                    client.query(createTable)
                        .then(function (res) { return console.log(res); })
                        .catch(function (err) { return console.log(err); });
                    ;
                    release();
                    return [2 /*return*/];
                });
            }); });
        }
        catch (err) { }
        return [2 /*return*/];
    });
}); };
buildDb();
var importData = function () {
    try {
        glob_1.default("./blocklist-ipsets/**/*.ipset", function (err, files) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                loopFiles(files);
                return [2 /*return*/];
            });
        }); });
        glob_1.default("./blocklist-ipsets/**/*.netset", function (err, files) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                loopFiles(files);
                return [2 /*return*/];
            });
        }); });
    }
    catch (error) {
        console.log('import data error', error);
    }
};
setTimeout(function () { return importData(); }, 5000);
