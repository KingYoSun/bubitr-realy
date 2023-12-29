import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import bodyParser from "body-parser";
import { z, type AnyZodObject } from "zod";
import cors from "cors";
import RedisCli from "./client/redis.ts";
import { SettingsGetRequest, SettingsPutRequst } from "./api/Settings.ts";
import { SettingsRequestSchema } from "shared/types/Settings.ts";

const dataSchema = (schema): any =>
  z.object({
    body: schema,
  });

const validate =
  async (schema: AnyZodObject) =>
  async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<Response | undefined> => {
    try {
      await schema.passthrough().parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (e) {
      return e;
    }
  };

const redis = new RedisCli();

await Promise.all([
  (async () => {
    await redis.init();
  })(),
]);

const app: express.Express = express();
const port = 8090;

app.use(
  cors({
    origin: "http://localhost:5173", // アクセス許可するオリジン
    credentials: true, // レスポンスヘッダーにAccess-Control-Allow-Credentials追加
    optionsSuccessStatus: 200, // レスポンスstatusを200に設定
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res: Response) => {
  res.send("Status is Healthy");
});

app.get("/settings", (async (_req, res: Response) => {
  const body = await SettingsGetRequest({ redis });

  res.status(body.status).send(body.message);
}) as RequestHandler);

app.put("/settings", (async (req: Request, res: Response) => {
  await validate(dataSchema(SettingsRequestSchema));
  const body = await SettingsPutRequst({ redis, settings: req.body });

  if (body != null) {
    res.status(body.status).send(body.message);
  } else {
    res.status(500).send("response body is null");
  }
}) as RequestHandler);

app.post("/post-test", (req: Request, res: Response) => {
  res.send(`Received: ${JSON.stringify(req.body)}`);
});

app.listen(port, () => {
  console.log(`Express app is listening on port ${port}`);
});
