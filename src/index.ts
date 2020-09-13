import express, {Application} from 'express';
import shell from 'shelljs';
import glob from 'glob';
import fs from 'fs';
import dotenv, { DotenvConfigOptions } from 'dotenv';
import lineReader from 'line-reader';
import es from 'event-stream';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { Pool } from 'pg';

//let fetchedFiles = []

type DotConfig = DotenvConfigOptions & {
  silent: boolean;
}
type InsertQuery = {
  name: string;
  text: string;
  values? : string[];
};

const app: Application = express();
const port: number = 3000;
const dotConfig: DotConfig = {
  silent: true,
}

dotenv.config(dotConfig);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const pool = new Pool({
  host: process.env.host,
  port: parseInt(<string>process.env.db_port, 10),
  database: process.env.database,
  user: process.env.username,
  password: process.env.password,
  max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

app.get("/", (req, res) => {
  res.send("Welcome To Davids Fluentstream Ip Search!");
});

app.post("/ip", (req, res) => {
  const { ip } = req.body;

  console.log(ip, req.body)
  try {
    const query = {
      name: "fetch-data",
      text: "SELECT * FROM ipsets WHERE ipset =$1",
      values: [ip],
    };

    pool.connect(async (err, client, release) => {
      if (err) {
        return console.error("Error acquiring client", err.stack);
      }
      
      const { rows } = await client.query(query);
    
      res.json({ data: rows.length > 0 ? true: false });

      release();
    });
  } catch (err) {
    console.log(err)
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});



setTimeout(() => shell.exec("./pull-repo.sh"), 1000 )

cron.schedule("0 0 * * *", () => {
    shell.exec("./pull.sh");
    importData()
});



const validIPaddress = (ipaddress: string): boolean => {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ipaddress
    )
  ) {
    return true;
  }

  return false;
};

const loopFiles = (fetchedFiles: string[]) => {
  console.log("Fetching from repo");
  fetchedFiles.forEach((file) => {
    let validIps: string[] = [];

    let lineNr = 0;

    let s = fs
      .createReadStream(`${file}`)
      .pipe(es.split())
      .pipe(
        es
          .mapSync(function (line: string) {
            // pause the readstream
    
            if (validIPaddress(line)) {
                validIps.push(line)
            }
            s.pause();

            lineNr += 1;

            // process line here and call s.resume() when rdy
            // function below was for logging memory usage
           

            // resume the readstream, possibly from a callback
            s.resume();
          })
          .on("error", function (err: any) {
            console.log("Error while reading file.", err);
          })
          .on("end", function () {
            console.log("Read entire file.");
          })
      );
      
      insertIntoDb(validIps);
  });
};

const insertIntoDb = (data: string[]) => {
  try {
    const insertQuery: InsertQuery  = {
      name: "insert-table",
      text: "INSERT INTO ipsets (ipset) VALUES ($1);",
    };

    pool.connect(async (err, client, release) => {
      if (err) {
      
        return console.error("Error acquiring client", err.stack);
      }

      data.forEach(async (ips) => {
        console.log(ips)
        insertQuery.values = [ips];
        const res = await client.query(insertQuery);
        //   console.log(res);
      });

      // release();
    });
  } catch (err) {
    console.log(err)
  }
};


const buildDb = async () => {

  const createTable = {
    name: "create-table",
    text: `
            CREATE TABLE IF NOT EXISTS ipsets (
                id SERIAL PRIMARY KEY,
                ipset VARCHAR(20) UNIQUE
            );
        `,
  };

  try {
    pool.connect(async (err, client, release) => {
      if (err) {
        console.log(err)
        return console.error("Error acquiring client", err.stack);
      }

      await client.query(createTable);

      // release();
    });
  } catch (err) {}
};

buildDb()

const importData = () => {
    glob("./blocklist-ipsets/**/*.ipset", async (err, files) => {
      loopFiles(files);
    });

    glob("./blocklist-ipsets/**/*.netset", async (err, files) => {
      loopFiles(files);
    });
    
}

setTimeout(() => importData(), 5000);






