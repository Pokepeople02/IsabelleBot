import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import { GuildContract } from "./guild-contract";

/**Interface for Command objects dynamically built during on-start initialization. */
export interface Command {

    /** JSON data for the command, built with discord.js' SlashCommandBuilder. */
    data: SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;

    /**Executes associated behavior of the command.
     * @param interaction The prompting slash-command interaction.
     * @param contract The contract of the guild in which the interaction is taking place.
     */
    execute( interaction: ChatInputCommandInteraction, contract: GuildContract ): Promise<void>;

}//end interface Command