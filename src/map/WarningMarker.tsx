import { Marker } from "react-map-gl/maplibre";
import type { ReportRow } from "@/db/types";
import { ThreatPin } from "./ThreatPin";

type Props = {
  report: ReportRow;
  onSelect: (report: ReportRow) => void;
};

export function WarningMarker({ report, onSelect }: Props) {
  return (
    <Marker longitude={report.lng} latitude={report.lat} anchor="center">
      <ThreatPin
        label={`Warnung ${report.status}, antippen zum Vorlesen`}
        onSelect={() => onSelect(report)}
      />
    </Marker>
  );
}
