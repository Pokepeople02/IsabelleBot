import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Snowflake, ApplicationCommand, Collection, MessagePayload } from "discord.js";
import { Command } from "../../Command";
import { play } from "../execution/Play";
import { Request } from "../../requests/Request";
import { BadRequestError } from "../../errors/BadRequestError";
import { TimeoutError } from "../../errors/TimeoutError";
import { ResourceUnobtainableError } from "../../errors/ResourceUnobtainableError";
import { EmbedBuilder } from "@discordjs/builders";
import { UnresolvedChannelError } from "../../errors/UnresolvedChannelError";

/**Contains JSON data for the /play command and a method for responding to /play calls. */
let Play: Command = {

    /** JSON data for the /play command. */
    data: new SlashCommandBuilder()
        .setName( "play" )
        .setDescription( "Adds a new request to the queue for your current voice channel." )
        .addStringOption( option => option
            .setName( "request" )
            .setDescription( "Your request to be played." )
        )
        .toJSON(),

    /** Determines the voice channel of the calling user, initiates the behavior to handle the request made, and replies to the prompting interaction. */
    async execute( interaction: ChatInputCommandInteraction<"cached"> ): Promise<void> {
        const user = interaction.member;
        const userVoice = user.voice.channel;
        let request: Request;
        let commands: Collection<Snowflake, ApplicationCommand> = await globalThis.client.application!.commands.fetch();
        let playId: Snowflake = commands.filter( command => command.name === "play" ).first()!.id;
        let playChannelId: Snowflake = commands.filter( command => command.name === "play-channel" ).first()!.id;
        let playUserId: Snowflake = commands.filter( command => command.name === "play-user" ).first()!.id;

        //User not in voice channel, respond for failure
        if ( !userVoice ) {

            await interaction.reply( {
                embeds: [{
                    title: "❌  Unable to Add Request",
                    description: `You need to be in a voice channel to use </play:${playId}>.\nJoin a channel, or use either ` +
                        `</play-channel:${playChannelId}> or </play-user:${playUserId}> to add requests.`,
                }],
            } );

            return;
        }//end if

        await interaction.deferReply();

        //Initiate play or respond if failed
        try { request = await play( interaction, userVoice.id ); }
        catch ( error ) {
            let replyEmbed = new EmbedBuilder();

            globalThis.client.log( `Failed to add request -- ${error}`, interaction );

            replyEmbed.setTitle( "❌  Unable to Add Request" );

            if ( error instanceof BadRequestError ) {
                switch ( error.type ) {
                    case "invalid":
                        replyEmbed.setDescription( "Request is invalid and cannot be played. Please try a different request." );
                        break;
                    case "unknown":
                        replyEmbed.setDescription( "Unable to determine what type of request this is. Please try a different request." );
                        break;
                    case "unsupported":
                        replyEmbed.setDescription( "This type of request is not yet supported. Please try a different request." );
                        break;
                }//end switch
            } else if ( error instanceof UnresolvedChannelError )
                replyEmbed.setDescription( "Failed to determine what channel to play this request in. Please try a different channel." );
            else if ( error instanceof TimeoutError )
                replyEmbed.setDescription( "The source for this request took too long to respond. Please try again." );
            else if ( error instanceof ResourceUnobtainableError )
                replyEmbed.setDescription( "Could not obtain necessary info about this request, it may not be valid. Try again, or try a different request." );
            else {
                replyEmbed.setDescription( "An unknown error occurred while adding this request. Try again, or try a different request." );
            }//end if-else

            await interaction.editReply( { embeds: [replyEmbed] } );
            return;
        }//end try-catch

        //Reply for play success
        await interaction.editReply( {
            embeds: [{
                title: "✅  Added a Request",
                description: `Successfully queued [${request.title!}](${request.resourceUrl!}) for your channel.`,
                thumbnail: request.thumbnailUrl ? { url: request.thumbnailUrl } : undefined,
                fields: [
                    {
                        name: "Duration",
                        value: request.lengthFormatted!,
                        inline: true,
                    },
                    {
                        name: "Uploaded by",
                        value: request.creator!,
                        inline: true,
                    },
                ]
            }],
        } );

        return;
    }//end method execute
};

export { Play };