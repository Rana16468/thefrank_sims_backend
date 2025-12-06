import { Model } from 'mongoose';
import { USER_ROLE } from './user.constant';




export interface UserResponse {
  status: boolean;
  message: string;
}

export type TUser = {
  id: string;
  role:  'user' | 'admin' | 'superAdmin';
  provider?: 'googleAuth'
  name: string;
  subname:string;
  password: string;
  dateOfBirth: string;
  email: string;
  phoneNumber?: string;
  verificationCode: number;
  isVerify: boolean;
  status: 'isProgress' | 'Blocked';
  photo?: string;
  stripeAccountId?: string;
  isStripeConnected?: boolean;
  fcm?:string;
  location?:string;
  recoveryKey?:string;
  isDelete: boolean;
};

export interface UserModel extends Model<TUser> {

  isUserExistByCustomId(id: string): Promise<TUser>;

  isPasswordMatched(
    userSendingPassword: string,
    existingPassword: string,
  ): Promise<boolean>;
  isJWTIssuesBeforePasswordChange(
    passwordChangeTimestamp: Date,
    jwtIssuesTime: number,
  ): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
