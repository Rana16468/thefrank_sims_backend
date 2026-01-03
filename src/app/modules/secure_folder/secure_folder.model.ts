import { model, Schema, Types, Document } from "mongoose";
import { SecureFolderModel, TSecureFolder } from "./secure_folder.interface";
import { Folder_Name } from "./secure_folder.constant";
import config from "../../config";
import bcrypt from "bcrypt";

/* =========================
   Schema
========================= */

const SecureFolderSchema = new Schema<TSecureFolder, SecureFolderModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      enum: {
        values: [Folder_Name.SecureFolder],
        message: "{VALUE} is not valid",
      },
      default: Folder_Name.SecureFolder,
      index: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   JSON Transform
========================= */

SecureFolderSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret:any) => {
    delete ret.password;
    return ret;
  },
});

SecureFolderSchema.pre(
  "save",
  async function (this: TSecureFolder & Document, next) {
     const securefolders = this;
     if (securefolders.isModified("password")) {
       securefolders.password = await bcrypt.hash(
         securefolders.password  as string,
         Number(config.bcrypt_salt_rounds)
       );
     }
     next();
  }
);

SecureFolderSchema.pre("find", function (next) {
  this.where({ isDelete: { $ne: true } });
  next();
});

SecureFolderSchema.pre("findOne", function (next) {
  this.where({ isDelete: { $ne: true } });
  next();
});

SecureFolderSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});


SecureFolderSchema.statics.isSecureFolderCustomId = function (
  id: string
): Promise<TSecureFolder | null> {
  return this.findById(id);
};

SecureFolderSchema.statics.isPasswordMatched =async function (
  plainTextPassword: string,
  hashPassword: string
) {
  const password = await bcrypt.compare(plainTextPassword, hashPassword);
  return password;
};

const securefolders = model<TSecureFolder, SecureFolderModel>(
  "securefolders",
  SecureFolderSchema
);

export default securefolders;




