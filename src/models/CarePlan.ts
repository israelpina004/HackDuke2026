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

export interface IContactInfo {
  name?: string;
  phone?: string;
  facility?: string;
}

export interface ICarePlan extends Document {
  coordinatorId: string;
  createdByRole: 'Coordinator' | 'Caregiver';
  caregiverIds: string[];
  inviteCode: string;
  patientName: string;
  originalLanguage: string;
  medications: IMedication[];
  careInstructions: ICareInstruction[];
  redFlags: IRedFlag[];
  calendarEvents: ICalendarEvent[];
  documents: { data: string; mimeType: string }[];
  contactInfo?: IContactInfo;
  notes?: string;
  translations: Map<string, {
    medications: IMedication[];
    redFlags: IRedFlag[];
    careInstructions: ICareInstruction[];
  }>;
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
    coordinatorId: { type: String, default: '', index: true },
    createdByRole: { type: String, enum: ['Coordinator', 'Caregiver'], required: true, default: 'Coordinator' },
    caregiverIds: { type: [String], default: [] },
    inviteCode: { type: String, required: true, unique: true, index: true },
    patientName: { type: String, required: true },
    medications: { type: [MedicationSchema], default: [] },
    careInstructions: { type: [CareInstructionSchema], default: [] },
    redFlags: { type: [RedFlagSchema], default: [] },
    calendarEvents: { type: [CalendarEventSchema], default: [] },
    documents: [{
      data: { type: String, required: true },
      mimeType: { type: String, required: true },
    }],
    contactInfo: {
      name: { type: String },
      phone: { type: String },
      facility: { type: String },
    },
    notes: { type: String, default: "" },
    originalLanguage: { type: String, default: 'en' },
    translations: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CarePlan || mongoose.model<ICarePlan>('CarePlan', CarePlanSchema);
