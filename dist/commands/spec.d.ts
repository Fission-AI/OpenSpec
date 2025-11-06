import { program } from 'commander';
interface ShowOptions {
    json?: boolean;
    requirements?: boolean;
    scenarios?: boolean;
    requirement?: string;
    noInteractive?: boolean;
}
export declare class SpecCommand {
    private SPECS_DIR;
    show(specId?: string, options?: ShowOptions): Promise<void>;
}
export declare function registerSpecCommand(rootProgram: typeof program): import("commander").Command;
export {};
//# sourceMappingURL=spec.d.ts.map