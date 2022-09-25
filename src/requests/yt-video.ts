import { AudioPlayer, createAudioResource } from "@discordjs/voice";
import { Snowflake } from "discord.js";
import { InfoData, stream_from_info, video_info, yt_validate } from "play-dl";
import { AbstractRequest } from "./abstract-request";

/**A request for a specific YouTube video resource made using a direct link or raw video ID.*/
export class YouTubeVideoRequest extends AbstractRequest {

    /**The input YouTube video URL or raw video ID after being scrubbed of potential post-ID data, such as playlists*/
    private cleanInput: string;
    /**The Play-DL info retreived for the request. */
    private info: InfoData | undefined;

    /**Creates a new uninitialized request for a YouTube Video resource.
     * @param input A direct link to a YouTube video, or a raw YouTube video ID.
     * @param userId The ID of the user who made this request.
     * @param channelId The ID of the channel in which this request is to be played.
     */
    constructor( input: string, userId: Snowflake, channelId: Snowflake ) {
        super( input, userId, channelId );

        if ( input.toLowerCase().includes( "youtube.com" ) && input.includes( "&" ) )
            this.cleanInput = input.substring( 0, input.indexOf( "&" ) );
        else
            this.cleanInput = input;

        if ( !( this.cleanInput.includes( "youtube.com/" ) && yt_validate( this.cleanInput ) === "video" ) )
            throw new Error( "The input provided does not resolve to a valid YouTube video." );
    }//end constructor

    public async init(): Promise<void> {
        if ( this.ready )
            return;

        return new Promise<void>( ( resolve, reject ) => {
            setTimeout( () => { reject( "Unable to initialize request within time limit" ); }, this.timeLimit );

            video_info( this.cleanInput )
                .then( ( info ) => {
                    this.info = info;
                    this._resourceUrl = info.video_details.url;
                    this._title = info.video_details.title ?? "Unknown";
                    this._creator = info.video_details.channel?.name ?? "Unknown";
                    this._length = info.video_details.durationInSec;
                    this.end = info.video_details.durationInSec;
                    this._thumbnailUrl = info.video_details.thumbnails[0]?.url;
                    this._ready = true;

                    resolve();
                } )
                .catch( ( reason ) => { reject( `Unable to obtain video info: ${reason}` ); } );
        } );

    }//end method init

    public play( player: AudioPlayer ): Promise<void> {

        return new Promise<void>( ( resolve, reject ) => {
            if ( !this.ready )
                reject( "Request is not fully initialized" );

            setTimeout( () => { reject( "Unable to obtain resource stream within time limit" ); }, this.timeLimit );

            stream_from_info( this.info!, { discordPlayerCompatibility: true } )
                .then( ( stream ) => {
                    this.resource = createAudioResource( stream.stream, { inputType: stream.type } );

                    player.play( this.resource );
                    this.player = player;

                    resolve();
                } )
                .catch( ( reason ) => { reject( `Unable to obtain stream: ${reason}` ); } );
        } );

    }//end method play

    public pause(): Promise<void> {
        throw new Error( "Method not implemented." );
    }//end method pause

    public resume(): Promise<void> {
        throw new Error( "Method not implemented." );
    }//end method resume

}//end class YouTubeVideoRequest