import { ChatInputCommandInteraction, GuildBasedChannel } from "discord.js";
import { GuildContract } from "../../guild-contract";


/**Sets the channel where bot status messages are sent for a guild.
 * @param interaction The prompting command interaction.
 * @param contract The contract to be updated that is associated with the given guild.
 * @param channel The guild channel to be set as the new home channel.
 * @returns 
 */
export function setHomeChannel( interaction: ChatInputCommandInteraction, contract: GuildContract, channel: GuildBasedChannel ): void {

    if ( !channel.isTextBased() ) {
        globalThis.client.log( `Failed to set home channel: channel "${channel.toString()}" is not text-based`, interaction );

        interaction.reply( {
            embeds: [{
                title: "❌  Unable to Set Home Channel",
                description: `${channel.toString()} is not a text-based channel. Please choose a different channel.\nCurrent home channel: ${contract.homeId ? globalThis.client.channels.resolve( contract.homeId )!.toString() : "none"}.`
            }]
        } );

        return;
    }//end if

    contract.homeId = channel.id;

    globalThis.client.log( `Home channel set to "${channel.toString()}"`, interaction );

    interaction.reply( {
        embeds: [{
            title: "✅  Home Channel Set",
            description: `Successfully updated the home channel to ${channel.toString()}.`
        }],
    } );

    return;
}//end function setHomeChannel