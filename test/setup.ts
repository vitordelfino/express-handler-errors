import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import express, { Response, NextFunction } from "express";
import * as yup from "yup";

import { ErrorHandler } from "../src/lib/ErrorHandler";
import { CustomError } from "../src/models/CustomError";
import { CustomPrismaError } from "../src/models/CustomPrismaError";
import { Teste, ElseOtherCustomError, OtherCustomError } from "./ClassTest";
import logger from "./mock-logger";
import "express-async-errors";

const app = express();
const app2 = express();

app.use(express.json());
app2.use(express.json());

const yupError = async (req: any, _: Response, next: NextFunction) => {
  await yup
    .object()
    .shape({
      teste: yup.string().required()
    })
    .validate(req.body, { abortEarly: false });
  return next();
};

const classValidatorError = async (
  req: any,
  _: Response,
  next: NextFunction
) => {
  const transformed = plainToClass(Teste, req.body);
  await validateOrReject(transformed);
  return next();
};

app.post("/yup", yupError, (_: any, res: Response) => {
  res.json({ message: "OK" });
});

app.post("/class-validator", classValidatorError, (_, res: Response) => {
  res.json({ message: "OK" });
});

app.get("/custom-error", () => {
  throw new CustomError({
    code: "CustomError",
    message: "custom error",
    status: 400
  });
});

app.get("/custom-prisma-error", () => {
  throw new CustomPrismaError(["Some error", "Other error"]);
});

app.get("/error", () => {
  throw new Error("some error");
});

app2.get("/custom-other-error", () => {
  throw new OtherCustomError({
    code: "OTHER_ERROR",
    status: 400,
    message: "Throw another error"
  });
});

app2.get("/else-custom-other-error", () => {
  throw new ElseOtherCustomError({
    code: "ELSE_OTHER_ERROR",
    status: 500,
    message: "Throw another error"
  });
});

const otherError = (err: any, res: Response, next: NextFunction): any => {
  if (err instanceof OtherCustomError) {
    res.status(400).json(err.getErroResponse());
    return next(err);
  }
};

const elseOtherError = (err: any, res: Response, next: NextFunction): any => {
  if (err instanceof ElseOtherCustomError) {
    res.status(500).json(err.getErroResponse());
    return next(err);
  }
};

app.use((err: Error, _: any, res: Response, next: NextFunction) => {
  new ErrorHandler().handle(err, res, next);
});

app2.use((err: Error, _: any, res: Response, next: NextFunction) => {
  new ErrorHandler().handle(
    err,
    res,
    next,
    logger as any,
    otherError,
    elseOtherError
  );
});
export { app, app2 };
