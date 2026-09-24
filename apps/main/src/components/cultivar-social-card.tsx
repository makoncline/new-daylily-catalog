/* eslint-disable @next/next/no-img-element -- Satori renders the image into a PNG. */
import { Flower2 } from "lucide-react";
import type { AhsDisplayListing } from "@/lib/utils/ahs-display";

const cream = "#f7f5ec";
const amber = "#f4c477";
const green = "#07120e";
const printInk = "#193124";
const printSecondary = "#4b6052";
const printAccent = "#a86522";

export type CultivarSocialCardVariant = "share" | "print";

type Field = { label: string; value: string | null };
type ExtraDetails = {
  flowerShow: string | null;
  rebloom: string | null;
  awards: string | null;
  notes?: string | null;
};
const detailsRowWidth = 500;
const longDetailWidth = 480;

function getFieldWidth(field: Field) {
  const textWidth = Math.max(
    field.label.length * 9,
    (field.value?.length ?? 0) * 11,
  );
  return Math.min(Math.max(textWidth, 72), 185);
}

function flowFields(fields: Field[], breakAfterFirstRow?: string) {
  const rows: Field[][] = [];
  let row: Field[] = [];
  let rowWidth = 0;

  for (const field of fields.filter((entry) => entry.value)) {
    const fieldWidth = getFieldWidth(field);
    const nextWidth = fieldWidth + (row.length ? 24 : 0);

    if (row.length && rowWidth + nextWidth > detailsRowWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }

    rowWidth += fieldWidth + (row.length ? 24 : 0);
    row.push(field);

    if (field.label === breakAfterFirstRow && rows.length === 0) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
  }

  if (row.length) rows.push(row);
  return rows;
}

function DetailRow({
  fields,
  compact,
  variant,
}: {
  fields: Field[];
  compact: boolean;
  variant: CultivarSocialCardVariant;
}) {
  const isPrint = variant === "print";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        marginTop: compact ? 12 : 18,
        flexShrink: 0,
      }}
    >
      {fields.map((field, index) => (
        <div
          key={field.label}
          style={{
            display: "flex",
            flexDirection: "column",
            width: getFieldWidth(field),
            flexShrink: 0,
            marginRight: index < fields.length - 1 ? 12 : 0,
            paddingRight: index < fields.length - 1 ? 12 : 0,
            borderRight:
              index < fields.length - 1
                ? isPrint
                  ? "1px solid rgba(25, 49, 36, 0.24)"
                  : "1px solid rgba(247, 245, 236, 0.35)"
                : "none",
          }}
        >
          <span
            style={{
              color: isPrint ? printSecondary : "#c2c9c2",
              fontSize: 16,
              whiteSpace: "nowrap",
            }}
          >
            {field.label}
          </span>
          <span
            style={{
              color: isPrint ? printInk : cream,
              fontSize: 20,
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            {field.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function LongDetail({
  label,
  value,
  compact,
  variant,
}: Field & { compact: boolean; variant: CultivarSocialCardVariant }) {
  if (!value) return null;
  const isPrint = variant === "print";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: compact ? 12 : 18,
        width: longDetailWidth,
        flexShrink: 0,
        textShadow: isPrint
          ? "0 1px 5px rgba(255,255,255,.9)"
          : "0 2px 8px rgba(0,0,0,.85)",
      }}
    >
      <span
        style={{ color: isPrint ? printSecondary : "#c2c9c2", fontSize: 16 }}
      >
        {label}
      </span>
      <span
        style={{
          color: isPrint ? printInk : cream,
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.2,
          alignSelf: "flex-start",
          maxWidth: longDetailWidth,
        }}
      >
        {value.trim().replace(/\s+/g, " ")}
      </span>
    </div>
  );
}

export function CultivarSocialCard({
  title,
  ahsListing,
  extraDetails,
  imageUrl,
  variant = "share",
}: {
  title: string;
  ahsListing: AhsDisplayListing | null;
  extraDetails?: ExtraDetails;
  imageUrl?: string;
  variant?: CultivarSocialCardVariant;
}) {
  const isPrint = variant === "print";
  const attribution = [ahsListing?.hybridizer, ahsListing?.year]
    .filter(Boolean)
    .join(", ");
  const titleSize = title.length > 34 ? 38 : title.length > 24 ? 43 : 48;
  const detailRows = ahsListing
    ? [
        ...flowFields([
          { label: "Scape Height", value: ahsListing.scapeHeight },
          { label: "Bloom Size", value: ahsListing.bloomSize },
          { label: "Bloom Season", value: ahsListing.bloomSeason },
        ]),
        ...flowFields(
          [
            { label: "Form", value: ahsListing.form },
            { label: "Ploidy", value: ahsListing.ploidy },
            { label: "Foliage Type", value: ahsListing.foliageType },
            { label: "Bloom Habit", value: ahsListing.bloomHabit },
            { label: "Bud Count", value: ahsListing.budcount },
            { label: "Branches", value: ahsListing.branches },
            { label: "Fragrance", value: ahsListing.fragrance },
            { label: "Sculpting", value: ahsListing.sculpting },
            { label: "Flower Show", value: extraDetails?.flowerShow ?? null },
            { label: "Rebloom", value: extraDetails?.rebloom ?? null },
          ],
          "Bloom Habit",
        ),
      ]
    : [];
  const longTextLength =
    (ahsListing?.parentage?.length ?? 0) +
    (ahsListing?.color?.length ?? 0) +
    (extraDetails?.awards?.length ?? 0) +
    (extraDetails?.notes?.length ?? 0);
  const compact =
    detailRows.length > 4 ||
    (title.length > 20 && detailRows.length > 3) ||
    (Boolean(extraDetails?.awards) && detailRows.length > 3) ||
    longTextLength > 180;
  const fadeColor = isPrint ? "255,255,255" : "7,18,14";
  const fadeStops = [
    `rgba(${fadeColor},1) 0%`,
    `rgba(${fadeColor},1) 46%`,
    `rgba(${fadeColor},.97) 47%`,
    `rgba(${fadeColor},.89) 48%`,
    `rgba(${fadeColor},.75) 49%`,
    `rgba(${fadeColor},.59) 50%`,
    `rgba(${fadeColor},.41) 51%`,
    `rgba(${fadeColor},.24) 52%`,
    `rgba(${fadeColor},.11) 53%`,
    `rgba(${fadeColor},.03) 54%`,
    `rgba(${fadeColor},0) 55%`,
  ].join(", ");

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: 1200,
        height: 630,
        overflow: "hidden",
        backgroundColor: isPrint ? "#ffffff" : green,
        color: isPrint ? printInk : cream,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 550,
          top: 0,
          display: "flex",
          width: 650,
          height: 630,
          backgroundImage: isPrint
            ? "radial-gradient(circle at 65% 40%, #f8e9d8, #f3d6bf 48%, #e8e9df)"
            : "radial-gradient(circle at 65% 40%, #e5b280, #9d533f 48%, #29482c)",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            width={650}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          width: 1200,
          height: 630,
          backgroundImage: `linear-gradient(90deg, ${fadeStops})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          display: "flex",
          width: 410,
          height: 140,
          backgroundImage:
            "linear-gradient(0deg, rgba(7,18,14,.72), rgba(7,18,14,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          width: 1160,
          height: 590,
          border: isPrint
            ? "2px solid rgba(25,49,36,.55)"
            : "2px solid rgba(247,245,236,.68)",
          borderRadius: 22,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: 580,
          padding: "48px 0 32px 56px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            width: compact ? 670 : 580,
            flexShrink: 0,
            fontSize: compact ? Math.min(titleSize, 42) : titleSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.8,
          }}
        >
          {title}
        </div>
        {attribution && (
          <div
            style={{
              display: "flex",
              fontSize: compact ? 21 : 24,
              marginTop: 6,
              flexShrink: 0,
            }}
          >
            {attribution}
          </div>
        )}
        <div
          style={{
            display: "flex",
            width: 144,
            height: 4,
            marginTop: 12,
            flexShrink: 0,
            backgroundColor: isPrint ? printAccent : amber,
          }}
        />
        {ahsListing && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {detailRows.map((fields, index) => (
              <DetailRow
                key={`${index}-${fields[0]?.label}`}
                fields={fields}
                compact={compact}
                variant={variant}
              />
            ))}
            <LongDetail
              label="Parentage"
              value={ahsListing.parentage}
              compact={compact}
              variant={variant}
            />
            <LongDetail
              label="Color"
              value={ahsListing.color}
              compact={compact}
              variant={variant}
            />
            <LongDetail
              label="Awards"
              value={extraDetails?.awards ?? null}
              compact={compact}
              variant={variant}
            />
            <LongDetail
              label="Grower's Note"
              value={extraDetails?.notes ?? null}
              compact={compact}
              variant={variant}
            />
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          right: 50,
          bottom: 50,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          fontWeight: 700,
          color: cream,
          textShadow: "0 2px 12px rgba(0,0,0,.7)",
        }}
      >
        <Flower2 size={32} color={amber} />
        <span>Daylily Catalog</span>
      </div>
    </div>
  );
}
