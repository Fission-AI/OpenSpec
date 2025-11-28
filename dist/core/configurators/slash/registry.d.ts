import { SlashCommandConfigurator } from './base.js';
export declare class SlashCommandRegistry {
    private static configurators;
    static register(configurator: SlashCommandConfigurator): void;
    static get(toolId: string): SlashCommandConfigurator | undefined;
    static getAll(): SlashCommandConfigurator[];
}
//# sourceMappingURL=registry.d.ts.map