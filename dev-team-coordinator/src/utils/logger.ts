import * as vscode from 'vscode';
import { Logger } from '../types';

export function createLogger(context: vscode.ExtensionContext): Logger {
    const outputChannel = vscode.window.createOutputChannel('Dev Team Coordinator');
    context.subscriptions.push(outputChannel);

    return {
        debug(message: string, ...args: any[]): void {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[DEBUG ${timestamp}] ${message}`;
            if (args.length > 0) {
                outputChannel.appendLine(`${formattedMessage} ${JSON.stringify(args)}`);
            } else {
                outputChannel.appendLine(formattedMessage);
            }
        },

        info(message: string, ...args: any[]): void {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[INFO ${timestamp}] ${message}`;
            if (args.length > 0) {
                outputChannel.appendLine(`${formattedMessage} ${JSON.stringify(args)}`);
            } else {
                outputChannel.appendLine(formattedMessage);
            }
        },

        warn(message: string, ...args: any[]): void {
            const timestamp = new Date().toISOString();
            const formattedMessage = `[WARN ${timestamp}] ${message}`;
            if (args.length > 0) {
                outputChannel.appendLine(`${formattedMessage} ${JSON.stringify(args)}`);
            } else {
                outputChannel.appendLine(formattedMessage);
            }
        },

        error(message: string, error?: Error, ...args: any[]): void {
            const timestamp = new Date().toISOString();
            let formattedMessage = `[ERROR ${timestamp}] ${message}`;
            
            if (error) {
                formattedMessage += `\nError: ${error.message}`;
                if (error.stack) {
                    formattedMessage += `\nStack: ${error.stack}`;
                }
            }
            
            if (args.length > 0) {
                formattedMessage += `\nAdditional args: ${JSON.stringify(args)}`;
            }
            
            outputChannel.appendLine(formattedMessage);
        }
    };
}
