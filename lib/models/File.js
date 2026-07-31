import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    drive_file_id: {
      type: String,
      required: true,
    },
    drive_url: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    uploaded_by: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    size_bytes: {
      type: Number,
      default: 0,
    },
    storage_type: {
      type: String,
      enum: ["GOOGLE_DRIVE", "YOUTUBE"],
      default: "GOOGLE_DRIVE",
    },
    google_drive_id: {
      type: String,
      default: null,
    },
    youtube_url: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes for fast searching and filtering
FileSchema.index({ type: 1 });
FileSchema.index({ category: 1 });
FileSchema.index({ subject_id: 1 });
FileSchema.index({ uploaded_by: 1 });
FileSchema.index({ storage_type: 1 });
FileSchema.index({ name: "text" });

export default mongoose.models.File || mongoose.model("File", FileSchema);
