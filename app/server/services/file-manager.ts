import fs from "fs/promises";
import path from "path";
import { User } from "@shared/schema";

export interface FileInfo {
  name: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: Date;
  path: string;
}

export interface DirectoryListing {
  currentPath: string;
  files: FileInfo[];
  parent?: string;
}

export class FileManagerService {
  private getBasePath(): string {
    return process.env.NODE_ENV === "production" ? "/home" : "./user_files";
  }

  private getUserPath(username: string): string {
    return path.join(this.getBasePath(), username);
  }

  private async ensureUserDirectory(username: string): Promise<void> {
    const userPath = this.getUserPath(username);
    try {
      await fs.access(userPath);
    } catch {
      await fs.mkdir(userPath, { recursive: true });
    }
  }

  private validatePath(userPath: string, requestedPath: string): string {
    const normalizedPath = path.normalize(requestedPath);
    const fullPath = path.join(userPath, normalizedPath);
    
    // Ensure the path is within the user's directory
    if (!fullPath.startsWith(userPath)) {
      throw new Error("Access denied: Path outside user directory");
    }
    
    return fullPath;
  }

  async listDirectory(user: User, dirPath: string = "/"): Promise<DirectoryListing> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    await this.ensureUserDirectory(user.username);
    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, dirPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        let stats;
        
        try {
          stats = await fs.stat(entryPath);
        } catch {
          continue; // Skip files we can't stat
        }

        files.push({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
          size: entry.isFile() ? stats.size : undefined,
          lastModified: stats.mtime,
          path: path.join(dirPath, entry.name),
        });
      }

      // Sort: directories first, then files, alphabetically
      files.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        currentPath: dirPath,
        files,
        parent: dirPath !== "/" ? path.dirname(dirPath) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  async createDirectory(user: User, dirPath: string): Promise<void> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    await this.ensureUserDirectory(user.username);
    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, dirPath);

    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  }

  async deleteFile(user: User, filePath: string): Promise<void> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, filePath);

    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async readFile(user: User, filePath: string): Promise<Buffer> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  async writeFile(user: User, filePath: string, content: Buffer | string): Promise<void> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    await this.ensureUserDirectory(user.username);
    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, filePath);

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });

    try {
      await fs.writeFile(fullPath, content);
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  }

  async moveFile(user: User, sourcePath: string, destPath: string): Promise<void> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    const userPath = this.getUserPath(user.username);
    const fullSourcePath = this.validatePath(userPath, sourcePath);
    const fullDestPath = this.validatePath(userPath, destPath);

    try {
      await fs.rename(fullSourcePath, fullDestPath);
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  async getFileInfo(user: User, filePath: string): Promise<FileInfo> {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }

    const userPath = this.getUserPath(user.username);
    const fullPath = this.validatePath(userPath, filePath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        name: path.basename(filePath),
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.isFile() ? stats.size : undefined,
        lastModified: stats.mtime,
        path: filePath,
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error}`);
    }
  }

  getUserHomePath(user: User): string {
    if (!user.username) {
      throw new Error("User must have a username for file management");
    }
    return `/home/${user.username}`;
  }
}

export const fileManagerService = new FileManagerService();