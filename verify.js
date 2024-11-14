import gist from "./gist.js";

const guilds = ["Nope%20Ropes", "Danger%20Noodles"];

const givenRoles = [
  'VIP',
  'VIP+',
  'MVP',
  'MVP+',
  'MVP++',
  'Verified',
  'Member',
  'Snek',
  'Danger Noodle',
  'Nope Rope'
]

const get = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

export const verify = async (member) => {
  const users = await gist();
  const user = users.find(user => user.dcuser == member.user.username);
  if (!user) return;
  const d = await get(`https://api.mojang.com/user/profile/${user.uuid}`);

  let roles = [];

  // name change
  if (d.id == user.uuid && d.name != user.username) {
    const oldName = user.username;
    user.username = d.name;
    await gist(JSON.stringify(users));
    // TODO: make this change playerdata over to new name
  }

  // verified role
  roles.push(process.env.VERIFIED_ROLE_NAME);

  // guild roles
  let members = [];
  for (const guild of guilds) {
    const guildData = await get(`https://api.hypixel.net/v2/guild?key=${process.env.API_KEY}&name=${guild}`);
    if (guildData?.guild?.members) {
      members = members.concat(guildData.guild.members);
    }
  }
  const guildMember = members.find(m => m.uuid == user.uuid);
  if (guildMember) {
    member.setNickname(d.name + ' ' + toSuperscript(guildMember.rank.toLowerCase())).catch(console.error);
    if (givenRoles.includes(guildMember.rank)) {
      roles.push(guildMember.rank);
    }
  }
  else {
    member.setNickname(d.name).catch(console.error);
  }

  // rank role
  const playerData = await get(`https://api.hypixel.net/v2/player?key=${process.env.API_KEY}&uuid=${user.uuid}`);
  const rank = playerData?.player?.newPackageRank;
  if (rank) {
    if (playerData?.player?.monthlyPackageRange == 'NONE') {
      roles.push('MVP++');
    }
    else {
      roles.push(rank.replace('_PLUS', '+'));
    }
  }

  roles.forEach(async roleName => {
    const role = await member.guild.roles.cache.find(r => r.name == roleName);
    member.roles.add(role).catch(console.error);
  })

  member.roles.cache.forEach(role => {
    if (givenRoles.includes(role.name) && !roles.includes(role.name)) {
      member.roles.remove(role).catch(console.error);
    }
  })

  return {
    username: d.name,
    dcuser: member.user.username,
    userid: member.user.id
  }

}

export const unverify = async (member) => {
  let users = await gist()
  users = users.filter(user => user.dcuser !== member.user.username);
  await gist(JSON.stringify(users));
  member.roles.cache.forEach(async (role) => {
  if (givenRoles.includes(role.name)) {
    try {
      await member.roles.remove(role);
    }
    catch(e) {
      console.error(member.user.username + ' has elevated permissions. Cannot delete role.');
    }
  }
  });
}

const superscriptMap = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "x": "ˣ",
  "y": "ʸ",
  "z": "ᶻ",
  "a": "ᵃ",
  "b": "ᵇ",
  "c": "ᶜ",
  "d": "ᵈ",
  "e": "ᵉ",
  "f": "ᶠ",
  "g": "ᵍ",
  "h": "ʰ",
  "i": "ⁱ",
  "j": "ʲ",
  "k": "ᵏ",
  "l": "ˡ",
  "m": "ᵐ",
  "n": "ⁿ",
  "o": "ᵒ",
  "p": "ᵖ",
  "r": "ʳ",
  "s": "ˢ",
  "t": "ᵗ",
  "u": "ᵘ",
  "v": "ᵛ",
  "w": "ʷ",
  "x": "ˣ",
  "y": "ʸ",
  "z": "ᶻ"
}

function toSuperscript(input) {
  let result = '';
  for (let char of input) {
     if (superscriptMap[char]) {
       result += superscriptMap[char];
     } else {
       result += char;
     }
  }
  return result;
} 