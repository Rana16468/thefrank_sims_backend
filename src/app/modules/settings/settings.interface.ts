import { Model } from "mongoose";

export interface TAboutUs {
  aboutUs: string;
  isDelete: boolean;
}

export interface TPrivacyPolicy {
  PrivacyPolicy: string;
  isDelete: boolean;
}

export interface TTermsConditions {
  TermsConditions: string;
  isDelete: boolean;
}

export interface AboutModel extends Model<TAboutUs> {
  // eslint-disable-next-line no-unused-vars
  isAboutCustomId(id: string): Promise<TAboutUs>;
}

export interface PrivacyPolicyModel extends Model<TPrivacyPolicy> {
  // eslint-disable-next-line no-unused-vars
  isPrivacyPolicyCustomId(id: string): Promise<TPrivacyPolicy>;
}

export interface TermsConditionsModel extends Model<TTermsConditions> {
  // eslint-disable-next-line no-unused-vars
  isTermsConditionsCustomId(id: string): Promise<TTermsConditions>;
}
