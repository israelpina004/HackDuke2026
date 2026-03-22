import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface IRedFlag {
  issue: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ICareInstruction {
  instruction: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ICalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface ICarePlan extends Document {
  coordinatorId: string;
  caregiverIds: string[];
  inviteCode: string;
  patientName: string;
  medications: IMedication[];
  careInstructions: ICareInstruction[];
  redFlags: IRedFlag[];
  calendarEvents: ICalendarEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema<IMedication>({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
});

const RedFlagSchema = new Schema<IRedFlag>({
  issue: { type: String, required: true },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
});

const CareInstructionSchema = new Schema<ICareInstruction>({
  instruction: { type: String, required: true },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
});

const CalendarEventSchema = new Schema<ICalendarEvent>({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
});

const CarePlanSchema = new Schema<ICarePlan>(
  {
    coordinatorId: { type: String, required: true, index: true },
    caregiverIds: { type: [String], default: [] },
    inviteCode: { type: String, required: true, unique: true, index: true },
    patientName: { type: String, required: true },
    medications: { type: [MedicationSchema], default: [] },
    careInstructions: { type: [CareInstructionSchema], default: [] },
    redFlags: { type: [RedFlagSchema], default: [] },
    calendarEvents: { type: [CalendarEventSchema], default: [] }
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CarePlan || mongoose.model<ICarePlan>('CarePlan', CarePlanSchema);
