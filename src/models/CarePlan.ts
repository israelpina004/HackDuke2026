import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface ICarePlan extends Document {
  coordinatorId: string;
  caregiverIds: string[];
  inviteCode: string;
  patientName: string;
  medications: IMedication[];
  redFlags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
});

const CarePlanSchema = new Schema<ICarePlan>(
  {
    coordinatorId: { type: String, required: true, index: true },
    caregiverIds: { type: [String], default: [] },
    inviteCode: { type: String, required: true, unique: true, index: true },
    patientName: { type: String, required: true },
    medications: { type: [MedicationSchema], default: [] },
    redFlags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CarePlan || mongoose.model<ICarePlan>('CarePlan', CarePlanSchema);
