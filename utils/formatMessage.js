import * as emoji from 'node-emoji';
import emojiRegex from 'emoji-regex';
export const formatMessage = (message) => {
  if (message.stickers.size > 0) {
    return `Sent a sticker: ${message.stickers.first().name}`;
  }
 
  message = message.content.replace(/<@(\d+)>/g, (match, userId) => {
    const mention = message.guild.members.cache.get(userId);
    return mention ? `@${mention.displayName.split(' ')[0]}` : match;
  }).replace(/\n/g, ' ').replace(/\bez\b/g, "e.z");
 
  message = message.replace(emojiRegex(), (match) => {
		const name = emoji.which(match);
		return name? `:${name}:` : ':unknown:';
	});

  message = message.replace(/(https?:\/\/(?:www\.)?(?!youtube\.com|hypixel\.net)[^\s]+)/g, '(Link)');
 
  if (message.attachments) {
    message.attachments.forEach(attachment => {
      message += ' (Attachment)';
    })
  }
 
  return message;
}