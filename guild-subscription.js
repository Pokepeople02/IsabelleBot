const { 
	AudioPlayerStatus,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	entersState,
	getVoiceConnection,  
	joinVoiceChannel,
} = require ('@discordjs/voice');
const { promisify } = require( 'node:util' );
const wait = promisify(setTimeout);

module.exports.GuildSubscription = class GuildSubscription {
		
	/* Creates a new GuildSubscription with a given guild and creates the attached audio player. */
	constructor( guild ) {
		console.log( `\nCreating new subscription for guild '${guild.name}'.\n` );
		
		this.guild = guild; //Guild object to which this subscription belongs.
		this.audioPlayer = createAudioPlayer(); //Audio player attached to the voice connection of the subscription's guild.
		this.queue = []; //Queue of Resource objects corresponding to requests made in the subscription's guild.
		this.queueLock = false; //Flag to indicate whether the queue is locked for modification.
		this.botStatus = 'idle'; //The current status of the bot for the subscription's guild.
		this.standbyTimerID = -1; //ID of the Standby Timer for the bot.
		this.botBehaviorDefFlag = false; //Flag to indicate whether bot voice connection behavior has been defined yet.
		this.homeChannelId = null; //Snowflake ID of the home channel in which the bot announces newly playing tracks.
		
		//Set audio player behavior
		this.audioPlayer.on( 'stateChange', (oldState, newState) => {
			console.log( `\nAudio Player state change detected in guild '${this.guild.name}'. ` );
			console.log( `Old state: ${oldState.status.toString()}` );
			console.log( `New state: ${newState.status.toString()}` );
			
			//If transitioning to Idle state from non-Idle state, attempt to play the next resource and remove the currently playing one from the queue.
			if( newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle ) {
				console.log( 'Transition to Idle from non-Idle state.' );
				
				console.log( 'Shifting the last-played resource out of the queue.' );
				this.queue.shift();
				
				//If the queue is empty, transition to waiting.
				if( this.queue.length == 0 ) {
					this.updateStatus( 'waiting' );
					
				//If the room for the next request is empty and the queue has more requests, skip until the next request that will be heard. 
				//If none exist, the queue is not empty and transition to waiting.
				} else if( this.queue[0].channel.members.size <= 1 ) {
					
					while( this.queue[0] && this.queue[0].channel.members.size <= 1 )
						this.queue.shift();
					
					if( this.queue[0] ) { //Queue has valid entry.
						this.updateStatus( 'playing' );
					} else { //Went through the entire queue, and now it is empty
						this.updateStatus( 'waiting' );
					}//end if-else
					
				} else { //Else, play the next resource. 
					this.updateStatus( 'playing' );
				}//end if-else
				
			}//end if
		} );
		//On error
		this.audioPlayer.on( 'error', error => {
			console.log( 'Encountered error with current resource: ' + error.message );
		} );
		
	}//end constructor method
		
	/* Sets the status of a guild's bot.
	 * Potential values for status are:
	 *	'idle' :		Bot is not in use. 
	 *		Upon idle, the queue is emptied, play ends, and the bot disconnects from the connected voice channel.
	 *	'playing' :		The bot is currently in use, and begins playing. 
	 *		The first resource in the queue is popped, and playback begins.
	 *	'standby' :		The bot is alone in a voice channel. 
	 *		Play will be paused, and idle will be entered after 10 minutes.
	 *		If a user enters the bot's voice channel, or the bot is moved to a populated voice channel, play resumes with the next request.
	 *	'waiting' : The bot has played the last queued request. The the queue is now empty.
	 *		After a 10 minute standby timer, the bot will enter idle.
	 */
	async updateStatus(newStatus) {
		
		//If not defined yet and if voice connection is active, define bot voice connection behaviors
		if( !this.botBehaviorDefFlag && getVoiceConnection(this.guild.id) )
			this.defineBotBehavior();
		
		switch(newStatus) {
			case 'idle' :
				this.botStatus = 'idle';
				console.log( `\nSetting status for guild '${this.guild.name}' to idle.` );
				
				console.log( 'Locking the queue.' );
				this.queueLock = true;
				
				console.log( 'Force-stopping the audio player.' );
				this.audioPlayer.stop(true); //Force-stop the audio player
				
				console.log( 'Clearing the queue.' );
				this.queue = []; //Clear queue
				
				console.log( 'Clearing the standby timer.' );
				clearTimeout( this.standbyTimer ); //Clear standby timer

				console.log( 'Destroying the audio connection.' );
				getVoiceConnection( this.guild.id )?.destroy(); //Disconnect from audio connection
				
				console.log( 'Unlocking the queue.' );
				this.queueLock = false;
				
				break;
			case 'playing' :
				this.botStatus = 'playing';
				console.log( `Setting status for guild '${this.guild.name}' to playing.` );
				
				console.log( 'Clearing the standby timer.' );
				clearTimeout( this.standbyTimer ); //Clear standby timer
				
				console.log( 'Grabbing the first entry from the queue.' );
				let nextEntry = this.queue[0]; //Pop next resource
				
				//Play next resource, if one exists
				if( nextEntry ) {
					//Resolve resource
					let audioResource = await nextEntry.resolve(); 
					
					//Play resource
					if( audioResource ) {
						
						//Join appropriate channel
						if( this.guild.me.voice?.channelId !== nextEntry.channel.id ) {
							console.log( `Joining voice channel '${nextEntry.channel.name}'.` );
							joinVoiceChannel( {
								channelId: nextEntry.channel.id,
								guildId: this.guild.id,
								adapterCreator: this.guild.voiceAdapterCreator,
							} );
						}//end if
						
						console.log( 'Subscribing voice connection to audio player.' );
						getVoiceConnection(this.guild.id).subscribe( this.audioPlayer );
						
						this.audioPlayer.play( audioResource );
					} else {
						console.log( 'Unable to resolve audio resource. Attempting to play next resource.' );
						this.updateStatus( 'playing' );
					}//end if-else
				}//end if
				//If no next resource exists, the queue is empty. Stop playing and set status to waiting.
				else {
					console.log( 'Next resource does not exist.' );
					this.updateStatus( 'waiting' );
				}//end if-else
			
				break;
			case 'standby' :
				this.botStatus = 'standby';
				console.log( `Setting status for guild '${this.guild.name}' to standby.` );
				
				//Set up standby timer
				this.standbyTimer = setTimeout( () => {
					this.updateStatus( 'idle' );
				}, 600000 );
				
				break;
			case 'waiting' :
				this.botStatus = 'waiting';
				console.log( `Setting status for guild '${this.guild.name}' to waiting.` );
				
				//Set up standby timer
				this.standbyTimer = setTimeout( () => {
					this.updateStatus( 'idle' );
				}, 600000 );
				
				
				break;
			default :
				throw ( 'Error: Invalid status update: ' + newStatus );
		}//end switch
		
	}; //end method setStatus
		
	/* Defines reconnection logic for the bot, tied to the active voice connection. */
	defineBotBehavior() {
		const voiceCon = getVoiceConnection(this.guild.id);
		console.log( 'Setting bot voice behaviors and reconnection logic.' );
		
		//Voice connection state transition behavior
		voiceCon.on( 'stateChange', async ( _, newState ) => {
			
			console.log( `\nVoice connection state change in guild '${this.guild.name}'.` );
			
			if( newState.status === VoiceConnectionStatus.Disconnected ) {
				console.log( 'Entered disconnected state' );
				
				if( newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014 ) {
					console.log( 'WebSocket closed with close code 4014' );
					
					try { await entersState( voiceCon, VoiceConnectionStatus.Connecting, 5000 ); }
					catch { voiceCon.destroy(); }
					
				} else if( voiceCon.rejoinAttempts < 5 ) {
					console.log( 'Attempting rejoin.' );
					
					await wait( (voiceCon.rejoinAttempts + 1) * 5000 );
					voiceCon.rejoin();
					
				} else {
					console.log( 'Rejoin attempts exceeded 5, transitioning to idle. ' );
					this.updateStatus( 'idle' );
				}//end if-else
				
			} else if( newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling ) {
				console.log( 'Entered connecting or signally state' );
				
				try { await entersState( voiceCon, VoiceConnectionStatus.Ready, 20000 ); }
				catch(error) {
					console.log( 'Did not enter ready state within 20 seconds.' );
					if( voiceCon.state.status !== VoiceConnectionStatus.Destroyed ) this.updateStatus( 'idle' );
				}//end try-catch
				
			}//end if-else
			
		} );

		this.botBehaviorDefFlag = true;
	}//end method defineVoiceConnBehavior
	
};//end class GuildSubscription