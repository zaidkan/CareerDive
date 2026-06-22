import {
  PathwayRecordSchema,
  type PathwayRecord,
} from "@sim/schemas";

export function evaluatePathwayRecord(
  input: PathwayRecord,
  now = new Date(),
):
  | {
      record: PathwayRecord;
      stale: false;
      strongClaimsAllowed: true;
    }
  | {
      record: PathwayRecord;
      stale: true;
      strongClaimsAllowed: false;
      warning: string;
    } {
  const record = PathwayRecordSchema.parse(input);
  const stale = new Date(record.nextReview).getTime() < now.getTime();
  if (!stale) {
    return { record, stale: false, strongClaimsAllowed: true };
  }
  return {
    record,
    stale: true,
    strongClaimsAllowed: false,
    warning: `This pathway information may be out of date. Verify it with ${record.authorityName}.`,
  };
}
