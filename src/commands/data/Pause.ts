import { ApplicationCommand, ChatInputCommandInteraction, Collection, SlashCommandBuilder, Snowflake, VoiceBasedChannel } from "discord.js";
import { Mode } from "../../Mode";
import { Request } from "../../requests/Request";

export const data = new SlashCommandBuilder()
    .setName( "pause" )
    .setDescription( "Pauses a playing request." )
    .toJSON();

export async function execute( interaction: ChatInputCommandInteraction<"cached"> ): Promise<void> {
    const contract = globalThis.client.contracts.get( interaction.guildId )!;
    const commands: Collection<Snowflake, ApplicationCommand> = await globalThis.client.application!.commands.fetch();
    const playId: Snowflake = commands.filter( command => command.name === "play" ).first()!.id;
    const playChannelId: Snowflake = commands.filter( command => command.name === "play-channel" ).first()!.id;
    const playUserId: Snowflake = commands.filter( command => command.name === "play-user" ).first()!.id;
    const resumeId: Snowflake = commands.filter( command => command.name === "resume" ).first()!.id;
    const skipId: Snowflake = commands.filter( command => command.name === "skip" ).first()!.id;
    let currentReq: Request | null = contract.currentRequest;
    let channel: VoiceBasedChannel | null = globalThis.client.guilds.resolve( contract.guildId )!.members.me!.voice.channel;

    //Respond error message when no requests
    switch ( contract.currentMode ) {
        case Mode.Idle:
        case Mode.Waiting:

            globalThis.client.log( "Failed /pause: queue is empty", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Pause",
                    description: "There's nothing playing to pause! Add a request to the queue with " +
                        `</play:${playId}>, </play-user:${playUserId}>, or </play-channel:${playChannelId}> to get started.`
                }],
            } );

            break;
        case Mode.Paused:

            globalThis.client.log( "Failed /pause: already paused", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Pause",
                    description: `[${currentReq!.title}](${currentReq!.resourceUrl!}) is already paused in ${channel!.toString()}. ` +
                        `Use </resume:${resumeId}> or </skip:${skipId}> to continue playing.`
                }],
            } );

            break;
        case Mode.Standby:

            globalThis.client.log( "Failed /pause: on standby", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Pause",
                    description: `Temporarily paused in ${channel!.toString()} on standby. ` +
                        `Join ${channel!.toString()}, wait for auto-skip if nobody joins, or use </skip:${skipId}> to continue playing.`
                }],
            } );

            break;
        case Mode.Playing:
            await contract.pause(); //No execution file because no necessary additional logic or error handling

            await interaction.reply( {
                embeds: [{
                    title: "✅  Paused a Request",
                    description: `Successfully paused [${currentReq!.title}](${currentReq!.resourceUrl!}) in ${channel!.toString()}.`
                }],
            } );
    };//end switch

    return;
}//end method execute
