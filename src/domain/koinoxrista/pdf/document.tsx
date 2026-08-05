import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
} from "@react-pdf/renderer";
import { pdfColors as c } from "./colors";
import type { KoinoxristaPdfViewModel, PdfApartmentPage } from "./view-model";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: c.ink,
    backgroundColor: c.marble0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 10,
  },
  brandTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: c.aegean700,
  },
  brandSub: {
    fontSize: 8,
    color: c.inkMuted,
    marginTop: 2,
  },
  titleBlock: {
    marginBottom: 14,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: c.ink,
    marginBottom: 4,
  },
  metaLine: {
    fontSize: 8,
    color: c.inkMuted,
    marginBottom: 2,
  },
  banner: {
    backgroundColor: c.aegean600,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 3,
  },
  bannerText: {
    color: c.marble0,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  bannerSub: {
    color: c.aegean100,
    fontSize: 8,
    marginTop: 2,
  },
  draftBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: c.brass50,
    borderWidth: 1,
    borderColor: c.brass500,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  draftText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: c.brass700,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: c.aegean700,
    marginBottom: 6,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  table: {
    borderWidth: 1,
    borderColor: c.marble300,
    borderRadius: 2,
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: c.aegean600,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  th: {
    color: c.marble0,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: c.marble200,
  },
  rowAlt: {
    backgroundColor: c.marble50,
  },
  cell: {
    fontSize: 8,
    color: c.ink,
  },
  cellMuted: {
    fontSize: 8,
    color: c.inkMuted,
  },
  cellRight: {
    fontSize: 8,
    color: c.ink,
    textAlign: "right",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: c.aegean50,
    borderWidth: 1,
    borderColor: c.aegean600,
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: c.aegean800,
  },
  totalAmount: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: c.brass500,
  },
  payBox: {
    marginTop: 16,
    backgroundColor: c.aegean50,
    borderWidth: 1.5,
    borderColor: c.aegean600,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  payCaption: {
    fontSize: 8,
    color: c.aegean700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  payAmount: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: c.brass500,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.marble300,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: c.inkMuted,
  },
  watermark: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    color: c.marble300,
    opacity: 0.45,
    transform: "rotate(-28deg)",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 8,
  },
  metaChip: {
    backgroundColor: c.marble100,
    borderWidth: 1,
    borderColor: c.marble300,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  metaChipLabel: {
    fontSize: 6,
    color: c.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaChipValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: c.ink,
    marginTop: 1,
  },
});

function BrandMarkPdf() {
  return (
    <Svg viewBox="0 0 32 32" style={{ width: 28, height: 28 }}>
      <Rect x="3" y="6" width="26" height="23" rx="3" fill={c.aegean600} />
      <Rect x="3" y="6" width="26" height="6" rx="3" fill={c.aegean800} />
      <Rect x="7.5" y="15" width="4" height="4" rx="1" fill={c.aegean100} />
      <Rect x="14" y="15" width="4" height="4" rx="1" fill={c.aegean100} />
      <Rect x="7.5" y="21.5" width="4" height="4" rx="1" fill={c.aegean100} />
      <Rect x="20.5" y="21.5" width="4" height="4" rx="1" fill={c.aegean100} />
      <Rect x="20.5" y="15" width="4" height="4" rx="1" fill={c.brass500} />
      <Rect x="14" y="21.5" width="4" height="4" rx="1" fill="#edc062" />
    </Svg>
  );
}

function PageFooter({
  vm,
  pageLabel,
}: {
  vm: KoinoxristaPdfViewModel;
  pageLabel: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Πολυκατοικία · {vm.buildingName} · {vm.periodLabel}
      </Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  );
}

function DraftWatermark({ show }: { show: boolean }) {
  if (!show) return null;
  return <Text style={styles.watermark}>ΠΡΟΣΧΕΔΙΟ</Text>;
}

function SummaryPage({ vm }: { vm: KoinoxristaPdfViewModel }) {
  return (
    <Page size="A4" style={styles.page}>
      <DraftWatermark show={vm.isDraft} />

      <View style={styles.headerRow}>
        <BrandMarkPdf />
        <View>
          <Text style={styles.brandTitle}>Πολυκατοικία</Text>
          <Text style={styles.brandSub}>Κατάσταση κοινοχρήστων</Text>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Συγκεντρωτική κατάσταση · {vm.periodLabel}
        </Text>
        <Text style={styles.bannerSub}>{vm.buildingName}</Text>
      </View>

      {vm.isDraft ? (
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>ΠΡΟΣΧΕΔΙΟ — δεν έχει οριστικοποιηθεί</Text>
        </View>
      ) : null}

      <View style={styles.metaGrid}>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Διεύθυνση</Text>
          <Text style={styles.metaChipValue}>
            {vm.buildingAddress?.trim() || "—"}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Περίοδος</Text>
          <Text style={styles.metaChipValue}>
            {vm.fromLabel} – {vm.toLabel}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Εκτύπωση</Text>
          <Text style={styles.metaChipValue}>{vm.printedAtLabel}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Κατανομή</Text>
          <Text style={styles.metaChipValue}>{vm.heatingModeLabel}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Δαπάνες περιόδου</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "44%" }]}>Κατηγορία</Text>
          <Text style={[styles.th, { width: "36%" }]}>Κλειδί</Text>
          <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
            Ποσό
          </Text>
        </View>
        {vm.categoryRows.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.cellMuted}>Καμία κατηγορία προς κατανομή</Text>
          </View>
        ) : (
          vm.categoryRows.map((row, i) => (
            <View
              key={row.key}
              style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}
            >
              <Text style={[styles.cell, { width: "44%" }]}>
                {row.categoryName}
              </Text>
              <Text style={[styles.cellMuted, { width: "36%" }]}>
                {row.methodLabel}
              </Text>
              <Text style={[styles.cellRight, { width: "20%" }]}>
                {row.amountLabel}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Γενικό σύνολο δαπανών</Text>
        <Text style={styles.totalAmount}>{vm.totalExpenseLabel}</Text>
      </View>

      {vm.skippedCents > 0 ? (
        <Text style={[styles.metaLine, { marginBottom: 10 }]}>
          Εκτός κατανομής (χειροκίνητα / χωρίς κατηγορία): {vm.skippedLabel}
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>Κατανομή ανά διαμέρισμα</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "18%" }]}>Διαμ.</Text>
          <Text style={[styles.th, { width: "52%" }]}>Ιδιοκτήτης</Text>
          <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>
            Πληρωτέο
          </Text>
        </View>
        {vm.apartmentSummaryRows.map((row, i) => (
          <View
            key={`${row.label}-${i}`}
            style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}
          >
            <Text
              style={[
                styles.cell,
                { width: "18%", fontFamily: "Helvetica-Bold" },
              ]}
            >
              {row.label}
            </Text>
            <Text style={[styles.cellMuted, { width: "52%" }]}>
              {row.ownerName?.trim() || "—"}
            </Text>
            <Text
              style={[
                styles.cellRight,
                { width: "30%", fontFamily: "Helvetica-Bold" },
              ]}
            >
              {row.totalLabel}
            </Text>
          </View>
        ))}
        <View
          style={[
            styles.row,
            { backgroundColor: c.aegean50, borderTopColor: c.aegean600 },
          ]}
        >
          <Text
            style={[
              styles.cell,
              { width: "70%", fontFamily: "Helvetica-Bold" },
            ]}
          >
            Σύνολο κατανομής
          </Text>
          <Text
            style={[
              styles.cellRight,
              {
                width: "30%",
                fontFamily: "Helvetica-Bold",
                color: c.brass500,
                fontSize: 10,
              },
            ]}
          >
            {vm.allocatableTotalLabel}
          </Text>
        </View>
      </View>

      <PageFooter vm={vm} pageLabel="Συγκεντρωτικό" />
    </Page>
  );
}

function ApartmentPage({
  vm,
  apartment,
  index,
  total,
}: {
  vm: KoinoxristaPdfViewModel;
  apartment: PdfApartmentPage;
  index: number;
  total: number;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <DraftWatermark show={vm.isDraft} />

      <View style={styles.headerRow}>
        <BrandMarkPdf />
        <View>
          <Text style={styles.brandTitle}>Πολυκατοικία</Text>
          <Text style={styles.brandSub}>Ατομική κατάσταση διαμερίσματος</Text>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Διαμέρισμα {apartment.label} · {vm.periodLabel}
        </Text>
        <Text style={styles.bannerSub}>{vm.buildingName}</Text>
      </View>

      {vm.isDraft ? (
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>ΠΡΟΣΧΕΔΙΟ — δεν έχει οριστικοποιηθεί</Text>
        </View>
      ) : null}

      <View style={styles.metaGrid}>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Ιδιοκτήτης</Text>
          <Text style={styles.metaChipValue}>
            {apartment.ownerName?.trim() || "—"}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Διεύθυνση</Text>
          <Text style={styles.metaChipValue}>
            {vm.buildingAddress?.trim() || "—"}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipLabel}>Περίοδος</Text>
          <Text style={styles.metaChipValue}>
            {vm.fromLabel} – {vm.toLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ανάλυση χρεώσεων</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "34%" }]}>Κατηγορία</Text>
          <Text style={[styles.th, { width: "28%" }]}>Κλειδί</Text>
          <Text style={[styles.th, { width: "16%", textAlign: "right" }]}>
            Χιλιοστά
          </Text>
          <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>
            Ποσό
          </Text>
        </View>
        {apartment.lines.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.cellMuted}>Καμία γραμμή</Text>
          </View>
        ) : (
          apartment.lines.map((line, i) => (
            <View
              key={`${line.categoryName}-${i}`}
              style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}
            >
              <Text style={[styles.cell, { width: "34%" }]}>
                {line.categoryName}
              </Text>
              <Text style={[styles.cellMuted, { width: "28%" }]}>
                {line.methodLabel}
              </Text>
              <Text style={[styles.cellRight, { width: "16%" }]}>
                {line.shareLabel}
              </Text>
              <Text style={[styles.cellRight, { width: "22%" }]}>
                {line.amountLabel}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.payBox}>
        <Text style={styles.payCaption}>Πληρωτέο ποσό</Text>
        <Text style={styles.payAmount}>{apartment.totalLabel}</Text>
      </View>

      <PageFooter
        vm={vm}
        pageLabel={`${apartment.label} · ${index + 1}/${total}`}
      />
    </Page>
  );
}

export function KoinoxristaPdfDocument({
  vm,
}: {
  vm: KoinoxristaPdfViewModel;
}) {
  return (
    <Document
      title={`Κοινόχρηστα ${vm.buildingName} ${vm.periodLabel}`}
      author="Πολυκατοικία"
      subject={`Κατάσταση κοινοχρήστων ${vm.periodLabel}`}
      language="el"
    >
      <SummaryPage vm={vm} />
      {vm.apartments.map((apt, i) => (
        <ApartmentPage
          key={apt.apartmentId}
          vm={vm}
          apartment={apt}
          index={i}
          total={vm.apartments.length}
        />
      ))}
    </Document>
  );
}
