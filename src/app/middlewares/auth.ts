import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';

import catchAsync from '../utils/asyncCatch';
import AppError from '../errors/AppError';
import config from '../config';
import { TUserRole } from '../modules/users/users.interface';
import users from '../modules/users/users.model';
import { USER_ACCESSIBILITY } from '../modules/users/user.constant';

const auth = (...requireRoles: TUserRole[]) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      const token = req.headers.authorization;
      if (!token) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'You are not Authorized',
          '',
        );
      }

      let decoded;

      try {
        decoded = jwt.verify(
          token,
          config.jwt_access_secret as string,
        ) as JwtPayload;
      } catch (error) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized', '');
      }

      const { role, id } = decoded;

      const isUserExist = users.findOne(
        {
          _id: id,
          isVerify: true,
          isDelete: false,
          status: USER_ACCESSIBILITY.isProgress,
        },
        { _id: 1 },
      );
      if (!isUserExist) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'This User is Not Founded',
          '',
        );
      }
      if (requireRoles && !requireRoles.includes(role)) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Yout Role Not Exist', '');
      }
      req.user = decoded as JwtPayload;

      next();
    },
  );
};

export default auth;