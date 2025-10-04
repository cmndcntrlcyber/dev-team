import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ClientCertificate } from "@shared/schema";

export interface CertificateUpload {
  certificateFile: Buffer;
  privateKeyFile: Buffer;
  caFile?: Buffer;
  originalNames: {
    certificate: string;
    privateKey: string;
    ca?: string;
  };
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
}

export class CertificateManagerService {
  private uploadDir = path.join(process.cwd(), 'uploads', 'certificates');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveCertificateFiles(upload: CertificateUpload): Promise<{
    certificateFile: string;
    privateKeyFile: string;
    caFile?: string;
  }> {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    
    const certificateFileName = `cert_${timestamp}_${randomId}.pem`;
    const privateKeyFileName = `key_${timestamp}_${randomId}.pem`;
    const caFileName = upload.caFile ? `ca_${timestamp}_${randomId}.pem` : undefined;

    const certificatePath = path.join(this.uploadDir, certificateFileName);
    const privateKeyPath = path.join(this.uploadDir, privateKeyFileName);
    const caPath = caFileName ? path.join(this.uploadDir, caFileName) : undefined;

    // Save certificate files
    await fs.writeFile(certificatePath, upload.certificateFile);
    await fs.writeFile(privateKeyPath, upload.privateKeyFile);
    if (upload.caFile && caPath) {
      await fs.writeFile(caPath, upload.caFile);
    }

    return {
      certificateFile: certificatePath,
      privateKeyFile: privateKeyPath,
      caFile: caPath,
    };
  }

  async parseCertificateInfo(certificateBuffer: Buffer): Promise<CertificateInfo> {
    try {
      // This is a simplified parser - in production, you'd use a proper X.509 parser
      const certString = certificateBuffer.toString('utf-8');
      const certData = this.extractCertificateData(certString);
      
      return {
        subject: certData.subject || 'Unknown',
        issuer: certData.issuer || 'Unknown',
        validFrom: certData.validFrom || new Date(),
        validTo: certData.validTo || new Date(),
        serialNumber: certData.serialNumber || 'Unknown',
        fingerprint: crypto.createHash('sha256').update(certificateBuffer).digest('hex'),
      };
    } catch (error) {
      throw new Error('Failed to parse certificate: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private extractCertificateData(certString: string): Partial<CertificateInfo> {
    // This is a simplified implementation
    // In production, you'd use proper X.509 parsing libraries
    const lines = certString.split('\n');
    const data: Partial<CertificateInfo> = {};
    
    // Extract basic info from PEM format
    // This is a placeholder - real implementation would parse ASN.1 structure
    data.subject = 'CN=Client Certificate';
    data.issuer = 'CN=Certificate Authority';
    data.validFrom = new Date();
    data.validTo = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    data.serialNumber = crypto.randomBytes(8).toString('hex');
    
    return data;
  }

  async validateCertificate(certificateBuffer: Buffer, privateKeyBuffer: Buffer): Promise<boolean> {
    try {
      // Basic validation - check if files are in PEM format
      const certString = certificateBuffer.toString('utf-8');
      const keyString = privateKeyBuffer.toString('utf-8');
      
      const hasCertHeader = certString.includes('-----BEGIN CERTIFICATE-----');
      const hasCertFooter = certString.includes('-----END CERTIFICATE-----');
      const hasKeyHeader = keyString.includes('-----BEGIN') && keyString.includes('PRIVATE KEY-----');
      const hasKeyFooter = keyString.includes('-----END') && keyString.includes('PRIVATE KEY-----');
      
      return hasCertHeader && hasCertFooter && hasKeyHeader && hasKeyFooter;
    } catch (error) {
      console.error('Certificate validation error:', error);
      return false;
    }
  }

  async deleteCertificateFiles(certificate: ClientCertificate): Promise<void> {
    try {
      if (certificate.certificateFile) {
        await fs.unlink(certificate.certificateFile);
      }
      if (certificate.privateKeyFile) {
        await fs.unlink(certificate.privateKeyFile);
      }
      if (certificate.caFile) {
        await fs.unlink(certificate.caFile);
      }
    } catch (error) {
      console.error('Error deleting certificate files:', error);
      // Don't throw - files might already be deleted
    }
  }

  async getCertificateContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read certificate file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async encryptPassphrase(passphrase: string): Promise<string> {
    // Simple encryption - in production, use proper key management
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(passphrase, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  async decryptPassphrase(encryptedPassphrase: string): Promise<string> {
    // Simple decryption - in production, use proper key management
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.SESSION_SECRET || 'default-secret', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedPassphrase.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    return decrypted;
  }
}

export const certificateManager = new CertificateManagerService();
