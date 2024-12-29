import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import WebSocket from 'ws';

import { Client, Intents, WebhookClient, MessageEmbed } from 'discord.js';
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const bridgeWebhook = new WebhookClient({ id: process.env.BRIDGE_WEBHOOK_ID, token: process.env.BRIDGE_WEBHOOK_TOKEN})

const ws = new WebSocket('ws://192.168.1.110:3000');
let guild;

let onlinePlayers = [];

import { verify, unverify } from './verify.js';
import gist from './gist.js';
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
	guild = await client.guilds.fetch(process.env.GUILD_ID);

	client.on('guildMemberAdd', async (member) => {
		await welcomeChannel.send('Welcome <@' + member.user.id + '>!');
		verify(member);
	});
	
	client.on('guildMemberRemove', async (member) => {
		await welcomeChannel.send('Goodbye ' + member.user.username);
	});

	const welcomeChannel = client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

	await guild.commands.create({
		name: "verify",
    description: "Links your minecraft account and discord account!",
    options: [{
        name: "username",
        type: "STRING",
        description: "username",
        required: true
    }]
	});

	await guild.commands.create({    
		name: "update",
    description: "updates specified user",
    options: [{
        name: "username",
        type: "USER",
        description: "Select a user to update",
        required: true
    }]
	})

	await guild.commands.create({
    name: "unverify",
    description: "Unlinks your minecraft and discord accounts",
	})

	await guild.commands.create({
		name: "say",
		description: "For admins only",
		options: [
			{
        name: "message",
        type: "STRING",
        description: "message",
        required: true
    	},
			{
        name: "guild",
        type: "STRING",
        description: "guild",
        required: true
    	}
		]
	})
});


const get = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

const sendVerifyEmbed = (interaction, title, colour, description) => {
	interaction.editReply({
		embeds: [
			new MessageEmbed()
				.setColor(colour)
				.setTitle(title)
				.setThumbnail('https://cdn.discordapp.com/avatars/1183752068490612796/f127b318f4429579fa0082e287c901fd.png?size=256?size=512')
				.setDescription(description)
		]
	});
}

import { formatMessage } from './utils/formatMessage.js';
client.on('message', async (message) => {
	if (message.channelId != process.env.BRIDGE_CHANNEL_ID) return;
	if (message.author.bot) return;

	let msg = formatMessage(message);
	if (message.reference && message.reference.messageId) {
		const repliedChannel = client.channels.cache.get(message.reference.channelId);
		const repliedMessage = await repliedChannel.messages.fetch(message.reference.messageId);
		const repliedContent = await formatMessage(repliedMessage);
		if (repliedMessage.webhookId || !repliedMessage.member) {
			msg = `${msg} ⤷ ${repliedMessage.author.username}: ${repliedContent}`;
		}
		else msg = `${msg} ⤷ ${repliedMessage.member.displayName.split(' ')[0]}: ${repliedContent} `;
	}
	msg = msg.substring(0, 250);
	
	console.log(message.member.displayName.split(' ')[0] + ": " + msg);
	ws.send(JSON.stringify({
		type: 'chat',
		player: message.member.displayName.split(' ')[0],
		message: msg
	}))
	let match;
	if (match = msg.match(/^\.(\S+)(?: (.+))?/)) {
		ws.send(JSON.stringify({
			type: 'command',
			player: message.member.displayName.split(' ')[0],
			command: match[1],
			args: match[2]
		}))
	}
})


client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return;
	switch (interaction.commandName) {

		case "verify":
			interaction.deferReply();
			const dcuser = interaction.user.username;
			const username = interaction.options.getString('username');
			const mData = await get('https://api.mojang.com/users/profiles/minecraft/' + username);
			const uuid = mData.id;
			const data = await get(`https://api.hypixel.net/v2/player?key=${process.env.API_KEY}&uuid=${uuid}`);
			if (!data.success || !data.player) {
				sendVerifyEmbed(interaction, 'Invalid Username', '#FF0000', `Player \`\`${username}\`\` doesn't exist or doesn't play hypixel.`);
				return;
			}
			if (dcuser.toLowerCase() != data.player.socialMedia?.links?.DISCORD?.toLowerCase()) {
				interaction.editReply({ embeds: [
					new MessageEmbed()
						.setColor('#FF0000')
						.setTitle('Error Linking')
						.setThumbnail('https://cdn.discordapp.com/avatars/1183752068490612796/f127b318f4429579fa0082e287c901fd.png?size=256?size=512')
						.setDescription(`Your minecraft linked discord username did not match. Try following the embedded gif in the main lobby.

						Type this in minecraft: \`\`${interaction.user.username}\`\`
						Your input username: \`\`${username}\`\``)
						.setImage('https://imgur.com/vvegsn6.gif')
				]});
				return;
			}
			const users = await gist();
			const user = users.find(u => u.dcuser.toLowerCase() == dcuser.toLowerCase());
			if (user) {
				sendVerifyEmbed(interaction, 'Error', '#FF0000', 'You are already verified.');
				return;
			}
			else {
				sendVerifyEmbed(interaction, 'Successfully linked', '#1EA863', `**Minecraft:** ${username} \n**Discord:** ${dcuser}\nExample: \`\`/verify ${username}\`\` in this channel to verify.`);
				users.push({
					uuid: uuid,
					dcuser: dcuser,
					username: username
				})
				await gist(JSON.stringify(users));
				verify(interaction.member);
			}
			break;

		case "unverify":
			await unverify(interaction.member);
			const unverifiedEmbed = new MessageEmbed()
			.setColor('#1EA863')
			.setTitle('Success')
			.setThumbnail('https://cdn.discordapp.com/avatars/1183752068490612796/f127b318f4429579fa0082e287c901fd.png?size=256?size=512')
			.setDescription('Successfully unverified and removed your roles.')
			interaction.reply({embeds: [unverifiedEmbed]});
			break;

		case "update":
			const embed = new MessageEmbed()
			.setTitle('Updated Member!')
			.setDescription('Successfully updated roles and nickname')
			.setColor('#1ea863')
			.setThumbnail('https://cdn.discordapp.com/avatars/1183752068490612796/f127b318f4429579fa0082e287c901fd.png?size=256?size=512')
			const member = interaction.options.getMember('username');
			verify(member);
			interaction.reply({embeds: [embed]})
			break;

		case "say":
			if (interaction.user.id !== process.env.OWNER_ID) return;
			const message = interaction.options.getString('message');
			const guild = interaction.options.getString('guild');
			ws.send({
				type: "say",
				message: message,
				guild: guild
			})
			interaction.reply({content: "Sent message", ephemeral:true});

		default:
			break;
	}
})




ws.on('open', () => {
	console.log('connected!');
	ws.send(JSON.stringify({
		type: 'init',
		guild: 'Discord',
		username: '*DiscordBot',
		prefix: 'dc'
	}))
})

const onClose = () => {
	bridgeWebhook.send({
		content: `Main Server Down <@${process.env.OWNER_ID}>`,
		username: 'Bridge Bot'
	})
}
ws.on('close', onClose);
ws.on('error', onClose);





ws.on('message', (data) => {
	const json = JSON.parse(data);
	switch(json?.type) {

		case "chat":
			console.log(json.player + ": " + json.message);
			bridgeWebhook.send({
				content: `${json.message}`,
				username: `[${json.prefix}] ${json.player}`,
				avatarURL: `https://minotar.net/helm/${json.player}/32`
			})
			break;
		
		case "playerListChange":
			onlinePlayers = json.players;
			client.user.setActivity(`${onlinePlayers.length} players!`, {
				type: "WATCHING"
			})
			
			if (json.difference > 0) {
				const embed = new MessageEmbed()
					.setColor('#00ff00')
					.setTitle(`${json.player} joined! (${onlinePlayers.length}/${"?"})`) // TODO: total players
					.setDescription('Welcome!')
					.setThumbnail(`https://minotar.net/helm/${json.player}/32`)
				bridgeWebhook.send({
					embeds: [embed],
					username: json.guild,
					avatarURL: 'https://cdn.discordapp.com/avatars/1232984080740515853/e0416e61f64c3d1659a271228e398fdd.png?size=256?size=512' // TODO: guild pfp
				})
			}
			else {
				const embed = new MessageEmbed()
					.setColor('#ff0000')
					.setTitle(`${json.player} left. (${onlinePlayers.length}/${"?"})`) // TODO: total players
					.setDescription('Goodbye!')
					.setThumbnail(`https://minotar.net/helm/${json.player}/32`)
				bridgeWebhook.send({
					embeds: [embed],
					username: json.guild,
					avatarURL: 'https://cdn.discordapp.com/avatars/1232984080740515853/e0416e61f64c3d1659a271228e398fdd.png?size=256?size=512' // TODO: guild pfp
				})
			}
			break;

		case "mute":
			const users = guild.members.cache.filter(user => user.displayName.split(" ")[0] == json.player);
			users.forEach(user => user.timeout(json.duration*1000, json.reason))
		
		default: 
			console.error("\nInvalid packet sent from server\n");
			break;
	}
})


client.login(process.env.BOT_TOKEN);
