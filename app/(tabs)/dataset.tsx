import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { colStats, parseCSV } from '../../utils/csvParser';
import { sendCSVEmail } from '../../utils/emailService';

const SAMPLE = `customerID,gender,SeniorCitizen,Partner,Dependents,tenure,PhoneService,MultipleLines,InternetService,OnlineSecurity,OnlineBackup,DeviceProtection,TechSupport,StreamingTV,StreamingMovies,Contract,PaperlessBilling,PaymentMethod,MonthlyCharges,TotalCharges,Churn
7590-VHVEG,Female,0,Yes,No,1,No,No phone service,DSL,No,Yes,No,No,No,No,Month-to-month,Yes,Electronic check,29.85,29.85,No
5575-GNVDE,Male,0,No,No,34,Yes,No,DSL,Yes,No,Yes,No,No,No,One year,No,Mailed check,56.95,1889.5,No
3668-QPYBK,Male,0,No,No,2,Yes,No,DSL,Yes,Yes,No,No,No,No,Month-to-month,Yes,Mailed check,53.85,108.15,Yes
7795-CFOCW,Male,0,No,No,45,No,No phone service,DSL,Yes,No,Yes,Yes,No,No,One year,No,Bank transfer (automatic),42.3,1840.75,No
9237-HQITU,Female,0,No,No,2,Yes,No,Fiber optic,No,No,No,No,No,No,Month-to-month,Yes,Electronic check,70.7,151.65,Yes
9305-CDSKC,Female,0,No,No,8,Yes,Yes,Fiber optic,No,No,Yes,No,Yes,Yes,Month-to-month,Yes,Electronic check,99.65,820.5,Yes
1452-KIOVK,Male,0,No,Yes,22,Yes,Yes,Fiber optic,No,Yes,No,No,Yes,No,Month-to-month,Yes,Credit card (automatic),89.1,1949.4,No
6713-OKOMC,Female,0,No,No,10,No,No phone service,DSL,Yes,No,No,No,No,No,Month-to-month,No,Mailed check,29.75,301.9,No
7892-POOKP,Female,0,Yes,No,28,Yes,Yes,Fiber optic,No,No,Yes,Yes,Yes,Yes,Month-to-month,Yes,Electronic check,104.8,3046.05,Yes
6388-TABGU,Male,0,No,Yes,62,Yes,No,DSL,Yes,Yes,No,No,No,No,One year,No,Bank transfer (automatic),56.15,3487.95,No
9763-GRSKD,Male,0,Yes,Yes,13,Yes,No,DSL,Yes,No,No,No,No,No,Month-to-month,Yes,Mailed check,49.95,587.45,No
7469-LKBCI,Male,0,No,No,16,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Two year,No,Credit card (automatic),18.95,326.8,No
8091-TTVAX,Male,0,Yes,No,58,Yes,Yes,Fiber optic,No,Yes,Yes,No,Yes,Yes,One year,No,Credit card (automatic),100.35,5681.1,No
0280-XJGEX,Male,0,No,No,49,Yes,Yes,Fiber optic,No,No,Yes,No,No,No,Month-to-month,Yes,Bank transfer (automatic),79.1,3905.1,Yes
5129-JLPIS,Male,0,No,No,25,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Two year,No,Mailed check,19.85,469,No
3655-SNQYZ,Female,0,Yes,Yes,69,Yes,Yes,Fiber optic,Yes,Yes,Yes,Yes,Yes,Yes,Two year,Yes,Credit card (automatic),106.7,7382.25,No
8191-XWSZG,Female,0,No,No,52,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,One year,No,Mailed check,20.65,1022.95,No
9959-WOFKT,Male,0,No,Yes,71,Yes,Yes,Fiber optic,Yes,No,Yes,No,No,Yes,Two year,No,Bank transfer (automatic),85.45,6316.2,No
4190-MFLUW,Female,0,Yes,No,10,Yes,No,DSL,No,No,Yes,Yes,No,No,Month-to-month,No,Credit card (automatic),68.45,687.35,Yes
4183-MYFRB,Female,0,No,No,21,Yes,No,Fiber optic,No,Yes,No,No,No,Yes,Month-to-month,Yes,Electronic check,78.7,1495.1,No
4183-MYFRB2,Male,0,No,No,5,Yes,No,Fiber optic,No,No,No,No,No,No,Month-to-month,Yes,Electronic check,66.7,333.5,Yes
8779-QRDMV,Male,1,No,No,1,Yes,No,DSL,No,No,No,No,No,No,Month-to-month,Yes,Electronic check,39.65,39.65,Yes
7419-IOXPQ,Female,0,No,No,72,Yes,Yes,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Two year,No,Mailed check,24.1,1734.65,No
2389-DSBUT,Female,0,Yes,Yes,51,Yes,No,DSL,Yes,Yes,Yes,Yes,Yes,No,One year,Yes,Electronic check,80.85,4067.6,No
9534-ALRQG,Male,0,No,No,72,Yes,Yes,Fiber optic,Yes,Yes,Yes,Yes,Yes,Yes,Two year,Yes,Credit card (automatic),111.15,8072.4,No`;

export default function DatasetScreen() {
  const { dataStores, activeDataStoreId, addDataStore, removeDataStore, setActiveDataStore, getActiveDataStore } = useAppContext();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [drag, setDrag] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);
  const PAGE = 5;
  const web = Platform.OS === 'web';

  const ds = getActiveDataStore();

  const loadSample = () => { try { const parsed = parseCSV(SAMPLE, 'Telco_Churn_Sample.csv'); addDataStore({ ...parsed, id: `sample-${Date.now()}` }); setPage(0); } catch (e: any) { Alert.alert('Error', e.message); } };

  const getCSVContent = (dataset: typeof ds) => {
    if (!dataset) return '';
    let csv = dataset.headers.join(',') + '\n';
    dataset.rows.forEach(r => {
      csv += dataset.headers.map(h => {
        const v = r[h];
        const str = String(v);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',') + '\n';
    });
    return csv;
  };

  const download = () => {
    if (!ds || !web) return;
    try {
      const csv = getCSVContent(ds);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ds.fileName || 'data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Alert.alert('Success', `Downloaded ${ds.fileName}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const sendEmail = async () => {
    if (!ds || !emails.trim()) return;
    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length === 0) { Alert.alert('Error', 'Please enter at least one email address'); return; }
    
    try {
      setSending(true);
      const csv = getCSVContent(ds);
      await sendCSVEmail({
        senderEmail: user?.email || 'noreply@datamind.com',
        senderName: user?.displayName || 'DataMind',
        recipients: emailList,
        subject: `Updated Dataset: ${ds.fileName}`,
        csvContent: csv,
        fileName: ds.fileName,
      });
      Alert.alert('Success', `CSV sent to ${emailList.length} recipient(s)`);
      setEmails('');
      setEmailModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const deleteData = () => {
    Alert.alert(
      'Delete Dataset',
      'Remove this dataset? This action cannot be undone.',
      [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { if (activeDataStoreId) removeDataStore(activeDataStoreId); } }
      ]
    );
  };

  const pick = async () => {
    try {
      setLoading(true);
      if (web) {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
        inp.onchange = async (e: any) => {
          const f = e.target.files[0]; if (!f) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try { const parsed = parseCSV(ev.target?.result as string, f.name); addDataStore({ ...parsed, id: `csv-${Date.now()}` }); setPage(0); }
            catch (err: any) { Alert.alert('Error', err.message); }
            finally { setLoading(false); }
          };
          reader.readAsText(f);
        };
        inp.click(); setLoading(false); return;
      }
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const txt = await (await fetch(res.assets[0].uri)).text();
      const parsed = parseCSV(txt, res.assets[0].name);
      addDataStore({ ...parsed, id: `csv-${Date.now()}` });
      setPage(0);
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  const drop = async (e: any) => {
    if (!web) return; e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv') && f.type !== 'text/csv') { Alert.alert('Error', 'Only CSV files.'); return; }
    try { const parsed = parseCSV(await f.text(), f.name); addDataStore({ ...parsed, id: `csv-${Date.now()}` }); setPage(0); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const rows = ds?.rows.slice(page * PAGE, (page + 1) * PAGE) || [];
  const pages = ds ? Math.ceil(ds.rowCount / PAGE) : 0;
  const visCols = ds ? (showAll ? ds.headers : ds.headers.slice(0, 6)) : [];

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <View style={st.hdr}><Text style={st.hdrT}>Dataset</Text><Text style={st.hdrS}>Manage your CSV data source</Text></View>
      <ScrollView style={st.scroll} contentContainerStyle={st.content}>
        {/* Upload */}
        <View style={[st.upload, drag && web ? st.uploadDrag : null]}
          {...(web ? { onDragOver: (e: any) => { e.preventDefault(); setDrag(true); }, onDragLeave: (e: any) => { e.preventDefault(); setDrag(false); }, onDrop: drop } : {})}>
          <View style={st.upIco}><Ionicons name="cloud-upload-outline" size={30} color="#00D4AA" /></View>
          <Text style={st.upTitle}>Load Dataset</Text>
          {web && <Text style={st.dragHint}>(or drag & drop a CSV file)</Text>}
          <Text style={st.upDesc}>Upload any structured CSV to query with natural language.</Text>
          <TouchableOpacity style={st.pri} onPress={pick} disabled={loading}>
            {loading ? <ActivityIndicator color="#0A0E1A" /> : <><Ionicons name="document" size={15} color="#0A0E1A" /><Text style={st.priT}>Upload CSV File</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={st.sec} onPress={loadSample}>
            <Ionicons name="flash" size={15} color="#00D4AA" /><Text style={st.secT}>Load Sample Telco Churn Data</Text>
          </TouchableOpacity>
        </View>

        {ds && <>
          {/* Stats */}
          <View style={st.statRow}>
            <Stat label="Rows" value={ds.rowCount.toLocaleString()} icon="layers" />
            <Stat label="Columns" value={String(ds.headers.length)} icon="grid" />
            <Stat label="File" value={ds.fileName.split('.')[0]} icon="document-text" small />
          </View>

          {/* Column info */}
          <View style={st.card}>
            <Text style={st.cardT}>📊 Columns</Text>
            <View style={st.colList}>
              {ds.headers.map(h => {
                const info = colStats(ds, h);
                return (
                  <View key={h} style={st.colTag}>
                    <Ionicons name={info.numeric ? 'calculator' : 'text'} size={9} color={info.numeric ? '#4ECDC4' : '#A0AEC0'} />
                    <Text style={st.colN}>{h}</Text>
                    <Text style={st.colD}>{info.numeric ? `${(info as any).min}–${(info as any).max}` : `${(info as any).unique} vals`}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Preview */}
          <View style={st.card}>
            <View style={st.cardHdr}>
              <Text style={st.cardT}>👁️ Preview ({page * PAGE + 1}–{Math.min((page + 1) * PAGE, ds.rowCount)} of {ds.rowCount})</Text>
              <View style={st.pgCtrl}>
                {ds.headers.length > 6 && <TouchableOpacity onPress={() => setShowAll(!showAll)}><Text style={st.showAllT}>{showAll ? 'Less' : 'All cols'}</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><Ionicons name="chevron-back" size={17} color={page === 0 ? '#2D3748' : '#A0AEC0'} /></TouchableOpacity>
                <Text style={st.pgLbl}>{page + 1}/{pages}</Text>
                <TouchableOpacity onPress={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}><Ionicons name="chevron-forward" size={17} color={page === pages - 1 ? '#2D3748' : '#A0AEC0'} /></TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={st.tRow}>{visCols.map(h => <View key={h} style={st.tCell}><Text style={st.tHdr} numberOfLines={1}>{h}</Text></View>)}</View>
                {rows.map((r, i) => (
                  <View key={i} style={[st.tRow, i % 2 === 0 && st.tRowAlt]}>
                    {visCols.map(h => <View key={h} style={st.tCell}><Text style={st.tCellT} numberOfLines={1}>{String(r[h]).slice(0, 18)}</Text></View>)}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtn} onPress={pick} disabled={loading}>
              <Ionicons name="refresh-circle-outline" size={15} color="#00D4AA" /><Text style={st.actionBtnT}>Replace CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtn} onPress={download}>
              <Ionicons name="download-outline" size={15} color="#4ECDC4" /><Text style={st.actionBtnT}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtn} onPress={() => setEmailModal(true)}>
              <Ionicons name="mail-outline" size={15} color="#82E0AA" /><Text style={st.actionBtnT}>Share Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, st.actionBtnDng]} onPress={deleteData}>
              <Ionicons name="trash-outline" size={15} color="#FC8181" /><Text style={[st.actionBtnT, st.actionBtnDngT]}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Dataset Selector - Show if multiple datasets exist */}
          {dataStores.length > 1 && (
            <View style={st.card}>
              <Text style={st.cardT}>📂 Loaded Datasets ({dataStores.length})</Text>
              <View style={st.datasetList}>
                {dataStores.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[st.datasetTag, d.id === activeDataStoreId && st.datasetTagActive]}
                    onPress={() => setActiveDataStore(d.id)}
                  >
                    <Text style={[st.datasetTagText, d.id === activeDataStoreId && st.datasetTagTextActive]} numberOfLines={1}>
                      {d.fileName.split('.')[0]}
                    </Text>
                    <Text style={[st.datasetTagSub, d.id === activeDataStoreId && st.datasetTagSubActive]}>
                      {d.rowCount} rows
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>}

        {/* Email Modal */}
        {emailModal && (
          <View style={st.modal}>
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Share CSV via Email</Text>
                <TouchableOpacity onPress={() => setEmailModal(false)}>
                  <Ionicons name="close" size={22} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
              <Text style={st.label}>Enter email addresses (comma-separated)</Text>
              <TextInput
                style={st.emailInput}
                placeholder="user1@email.com, user2@email.com"
                placeholderTextColor="#2D3748"
                value={emails}
                onChangeText={setEmails}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <Text style={st.hint}>Sending from: {user?.email || 'noreply@datamind.com'}</Text>
              <View style={st.modalBtnRow}>
                <TouchableOpacity style={st.modalBtnCancel} onPress={() => setEmailModal(false)}>
                  <Text style={st.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalBtnSend} onPress={sendEmail} disabled={sending}>
                  {sending ? <ActivityIndicator color="#0A0E1A" /> : <><Ionicons name="send" size={14} color="#0A0E1A" /><Text style={st.modalBtnSendText}>Send</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon, small }: { label: string; value: string; icon: string; small?: boolean }) {
  return <View style={st.stat}><Ionicons name={icon as any} size={17} color="#00D4AA" /><Text style={[st.statV, small && { fontSize: 11 }]} numberOfLines={1}>{value}</Text><Text style={st.statL}>{label}</Text></View>;
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  hdr: { paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1A2035' },
  hdrT: { color: '#E2E8F0', fontSize: 22, fontWeight: '800' },
  hdrS: { color: '#4A5568', fontSize: 12, marginTop: 3 },
  scroll: { flex: 1 }, content: { padding: 18, gap: 14, paddingBottom: 36 },
  upload: { backgroundColor: '#0F1525', borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#1A2035', borderStyle: 'dashed', gap: 10 },
  uploadDrag: { borderColor: '#00D4AA', backgroundColor: '#00D4AA08' },
  upIco: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#00D4AA12', borderWidth: 1, borderColor: '#00D4AA28', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  upTitle: { color: '#E2E8F0', fontSize: 17, fontWeight: '700' },
  dragHint: { color: '#718096', fontSize: 11 },
  upDesc: { color: '#4A5568', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  pri: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#00D4AA', borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, width: '100%', justifyContent: 'center', marginTop: 3 },
  priT: { color: '#0A0E1A', fontSize: 14, fontWeight: '700' },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#00D4AA12', borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, width: '100%', justifyContent: 'center', borderWidth: 1, borderColor: '#00D4AA28' },
  secT: { color: '#00D4AA', fontSize: 13, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 9 },
  stat: { flex: 1, backgroundColor: '#0F1525', borderRadius: 13, padding: 12, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#1A2035' },
  statV: { color: '#E2E8F0', fontSize: 15, fontWeight: '800' },
  statL: { color: '#4A5568', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: .5 },
  card: { backgroundColor: '#0F1525', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: '#1A2035', gap: 10 },
  cardHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardT: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  colList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  colTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0A0E1A', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#1A2035' },
  colN: { color: '#A0AEC0', fontSize: 10.5 },
  colD: { color: '#4A5568', fontSize: 9 },
  pgCtrl: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pgLbl: { color: '#4A5568', fontSize: 11 },
  showAllT: { color: '#00D4AA', fontSize: 10, fontWeight: '600' },
  tRow: { flexDirection: 'row' }, tRowAlt: { backgroundColor: '#070B14' },
  tCell: { width: 95, paddingHorizontal: 7, paddingVertical: 7, borderRightWidth: 1, borderRightColor: '#1A2035', borderBottomWidth: 1, borderBottomColor: '#1A2035' },
  tHdr: { color: '#00D4AA', fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase' },
  tCellT: { color: '#A0AEC0', fontSize: 10.5 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00D4AA12', borderRadius: 11, paddingVertical: 11, borderWidth: 1, borderColor: '#00D4AA28' },
  actionBtnT: { color: '#00D4AA', fontSize: 12, fontWeight: '600' },
  actionBtnDng: { backgroundColor: '#FC818108', borderColor: '#FC818128' },
  actionBtnDngT: { color: '#FC8181' },
  datasetList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  datasetTag: { flex: 1, minWidth: 120, backgroundColor: '#0A0E1A', borderRadius: 11, padding: 10, borderWidth: 1, borderColor: '#1A2035' },
  datasetTagActive: { borderColor: '#00D4AA55', backgroundColor: '#00D4AA0A' },
  datasetTagText: { color: '#718096', fontSize: 12, fontWeight: '700' },
  datasetTagTextActive: { color: '#00D4AA' },
  datasetTagSub: { color: '#4A5568', fontSize: 10, marginTop: 3 },
  datasetTagSubActive: { color: '#00D4AA88' },
  modal: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000055', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#0F1525', borderRadius: 18, padding: 20, width: '90%', maxWidth: 400, borderWidth: 1, borderColor: '#1A2035', gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  label: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginTop: 8 },
  emailInput: { backgroundColor: '#0A0E1A', borderRadius: 11, borderWidth: 1, borderColor: '#1A2035', color: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, minHeight: 80, fontFamily: 'monospace', fontSize: 12 },
  hint: { color: '#4A5568', fontSize: 11, lineHeight: 16 },
  modalBtnRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: '#1A2035', alignItems: 'center' },
  modalBtnCancelText: { color: '#A0AEC0', fontSize: 13, fontWeight: '600' },
  modalBtnSend: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 11, backgroundColor: '#00D4AA', gap: 6 },
  modalBtnSendText: { color: '#0A0E1A', fontSize: 13, fontWeight: '700' },
});