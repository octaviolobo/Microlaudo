import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Mobile: baixa o PDF assinado para um arquivo local (a folha de compartilhamento
// nativa do iOS/Android exige uma URI de arquivo, não aceita URLs remotas) e abre a
// folha do sistema. Na web, ver downloadPdfWeb (src/lib/webPdfDownload.ts).
export async function shareReportPdfNative(url: string, fileName: string): Promise<void> {
  const destination = new ExpoFile(Paths.cache, fileName);
  const file = await ExpoFile.downloadFileAsync(url, destination, { idempotent: true });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
