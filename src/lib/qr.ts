import QRCode from "qrcode";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}
