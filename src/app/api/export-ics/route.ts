import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { medicationName, dosage, frequency } = await req.json();

    if (!medicationName) {
      return NextResponse.json({ error: "Medication name is required." }, { status: 400 });
    }

    // Basic date formatting for ICS (YYYYMMDDTHHMMSSZ)
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Default to the next day at 8:00 AM as a starting point for the reminder
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const dtstart = tomorrow.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Set event to last 30 minutes
    const end = new Date(tomorrow);
    end.setMinutes(end.getMinutes() + 30);
    const dtend = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Build the raw ICS string
    // This sets up a daily recurring reminder for the medication
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Care Handoff Copilot//EN
BEGIN:VEVENT
UID:${now.getTime()}@carehandoff.com
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:Take ${medicationName} (${dosage || 'As prescribed'})
DESCRIPTION:Instruction: Take ${medicationName}.\\nDosage: ${dosage || 'N/A'}.\\nFrequency: ${frequency || 'N/A'}.
RRULE:FREQ=DAILY
END:VEVENT
END:VCALENDAR`;

    // Return as a downloadable .ics file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="medication_${medicationName.replace(/\s+/g, "_")}.ics"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating ICS:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
