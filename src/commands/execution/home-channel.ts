import { ChatInputCommandInteraction, GuildBasedChannel } from "discord.js";
import { GuildContract } from "../../guild-contract";


/**Sets the home channel, where bot status messages are sent, for a guild.
 * @param interaction The prompting command interaction.
 * @param channel The guild channel to be set as the new home channel.
 */
export function setHomeChannel( interaction: ChatInputCommandInteraction, channel: GuildBasedChannel ): void {
    const contract = globalThis.client.contracts.get( interaction.guildId! )!;

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

/**Resets the stored home channel, where bot status messages are sent, for a guild.
* @param interaction The prompting command interaction.
 */
export function clearHomeChannel( interaction: ChatInputCommandInteraction ) {
    const contract = globalThis.client.contracts.get( interaction.guildId! )!;

    contract.homeId = null;

    globalThis.client.log( "Home channel cleared", interaction );

    interaction.reply( {
        embeds: [{
            title: "✅  Home Channel Cleared",
            description: "Successfully cleared the home channel."
        }],
    } );

    return;
}//end function clearHomeChannel