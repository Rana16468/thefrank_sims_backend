import { Schema, model } from "mongoose";
import {
  AboutModel,
  PrivacyPolicyModel,
  TAboutUs,
  TermsConditionsModel,
  TPrivacyPolicy,
  TTermsConditions,
} from "./settings.interface";

const AboutUsSchema = new Schema<TAboutUs, AboutModel>(
  {
    aboutUs: {
      type: String,
      required: [true, "About Us content is required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
const PrivacyPolicySchema = new Schema<TPrivacyPolicy, PrivacyPolicyModel>(
  {
    PrivacyPolicy: {
      type: String,
      required: [true, "PrivacyPolicy content is required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const TermsConditionSchema = new Schema<TTermsConditions, TermsConditionsModel>(
  {
    TermsConditions: {
      type: String,
      required: [true, "TermsConditionsy content is required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

AboutUsSchema.statics.isAboutCustomId = async function (id: string) {
  return this.findById(id);
};
PrivacyPolicySchema.statics.isPrivacyPolicyCustomId = async function (
  id: string,
) {
  return this.findById(id);
};

TermsConditionSchema.statics.isTermsConditionsCustomId = async function (
  id: string,
) {
  return this.findById(id);
};

AboutUsSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});
AboutUsSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});
AboutUsSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

PrivacyPolicySchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});
PrivacyPolicySchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});
PrivacyPolicySchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TermsConditionSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});
TermsConditionSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});
TermsConditionSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

export const aboutus = model<TAboutUs, AboutModel>("aboutus", AboutUsSchema);
export const privacypolicys = model<TPrivacyPolicy, PrivacyPolicyModel>(
  "privacypolicys",
  PrivacyPolicySchema,
);

export const termsConditions = model<TTermsConditions, TermsConditionsModel>(
  " termsConditions",
  TermsConditionSchema,
);
