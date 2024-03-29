import { ApplicationCommand, ChatInputCommandInteraction, Collection, SlashCommandBuilder, Snowflake, VoiceBasedChannel } from "discord.js";
import { Mode } from "../../Mode";
import { Request } from "../../requests/Request";

export const data = new SlashCommandBuilder()
    .setName( "resume" )
    .setDescription( "Resumes a paused request." )
    .toJSON();

export async function execute( interaction: ChatInputCommandInteraction<"cached"> ): Promise<void> {
    const contract = globalThis.client.contracts.get( interaction.guildId )!;
    const commands: Collection<Snowflake, ApplicationCommand> = await globalThis.client.application!.commands.fetch();
    const playId: Snowflake = commands.filter( command => command.name === "play" ).first()!.id;
    const playChannelId: Snowflake = commands.filter( command => command.name === "play-channel" ).first()!.id;
    const playUserId: Snowflake = commands.filter( command => command.name === "play-user" ).first()!.id;
    const skipId: Snowflake = commands.filter( command => command.name === "skip" ).first()!.id;
    const pauseId: Snowflake = commands.filter( command => command.name === "pause" ).first()!.id;
    let currentReq: Request | null = contract.currentRequest;
    let channel: VoiceBasedChannel | null = globalThis.client.guilds.resolve( contract.guildId )!.members.me!.voice.channel;

    //Respond error message when no requests
    switch ( contract.currentMode ) {
        case Mode.Idle:
        case Mode.Waiting:

            globalThis.client.log( "Failed /resume: queue is empty", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Resume",
                    description: "There's nothing in the queue! Add a request to the queue with " +
                        `</play:${playId}>, </play-user:${playUserId}>, or </play-channel:${playChannelId}> to get started.`
                }],
            } );

            break;
        case Mode.Standby:

            globalThis.client.log( "Failed /resume: on standby", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Resume",
                    description: `Temporarily paused while on standby in ${channel!.toString()}. ` +
                        `Join ${channel!.toString()}, wait for auto-skip if nobody joins, or use </skip:${skipId}> to continue playing.`
                }],
            } );

            break;
        case Mode.Playing:

            globalThis.client.log( "Failed /resume: already playing", interaction );
            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Resume",
                    description: `Already playing [${currentReq!.title}](${currentReq!.resourceUrl!}) in ${channel!.toString()}. Pause it with </pause:${pauseId}> before resuming.`
                }],
            } );

            break;
        case Mode.Paused:
            await contract.resume(); //No execution file because no necessary additional logic or error handling

            await interaction.reply( {
                embeds: [{
                    title: "✅  Resumed a Request",
                    description: `Successfully resumed playing [${currentReq!.title}](${currentReq!.resourceUrl!}) in ${channel!.toString()}.`
                }],
            } );
    }//end switch

    return;
}//end method execute