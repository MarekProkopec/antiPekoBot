const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fs = require("fs");
const Discord = require("discord.js");
const replaceSpecialCharacters = require("replace-special-characters");

const prefix = "antipeko ";

// Token is for Discord apis, key is for riot api
const apiData = require("./json/key.json");
const token = apiData.token;

const possibleCommands = require("./json/possibleCommands.json");

let bannedWords = require("./json/bannedWords.json");
const adminList = require("./json/adminList.json");
const customDictonary = require("./json/customDictionary.json");

const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"],
  presence: {
    status: "dnd",
  },
});

// * App settings
const banTime = 30;

class banMananger {
  constructor() {
    this.list = [];
  }

  addBanned(user, timeout = 30) {
    const unbanTime = new Date().getTime() + timeout * 1000;
    let ban = this.list.find((e) => {
      return e.id == user.id;
    });
    if (!ban) {
      this.list.push({
        id: user.id,
        unbanTime,
      });
      return;
    }
    ban.unbanTime = unbanTime;
  }

  updateBanned() {
    this.list = this.list.filter((e) => {
      return e.unbanTime > new Date().getTime();
    });
  }

  handleUserBan(msg) {
    const listItem = this.list.find((e) => {
      return e.id == msg.author.id;
    });
    if (!listItem) return;

    msg.delete();
    const banTime = Math.round(
      (listItem.unbanTime - new Date().getTime()) / 1000
    );
    const embed = new Discord.MessageEmbed()
      .setColor("#F32424")
      .setTitle(`You are still banned for ${banTime} seconds`);
    msg.author.send({ embeds: [embed] });
  }
}
var bannedUsers = new banMananger();

client.on("ready", () => {
  console.log("Ready!");

  client.user.setActivity("antipeko", {
    type: "LISTENING",
  });
});

function checkForbiddenWord(msg) {
  msg = msg.content.replaceAll(" ", "");
  for(let letter of Object.keys(customDictonary)){
    msg = msg.replaceAll(letter, customDictonary[letter])
  }
  for (let word of bannedWords) {
    if (
      replaceSpecialCharacters(msg).toLowerCase().trim().endsWith(word)
    )
      return true;
  }
  return false;
}

function isAdmin(author) {
  return adminList.includes(author.id);
}

function addForbiddenWord(word) {
  bannedWords.push(word);
  fs.writeFileSync("./json/bannedWords.json", JSON.stringify(bannedWords));
}

function removeForbiddenWord(word) {
  bannedWords = bannedWords.filter((e) => e != word);
  fs.writeFileSync("./json/bannedWords.json", JSON.stringify(bannedWords));
}

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  bannedUsers.updateBanned();
  bannedUsers.handleUserBan(msg);

  if (msg.content.toLowerCase().startsWith(prefix + "help")) {
    const exampleEmbed = new Discord.MessageEmbed()
      .setColor("#FEE440")
      .setTitle("Help")
      .setThumbnail(
        "https://cdn0.iconfinder.com/data/icons/entypo/92/help-512.png"
      )
      .setDescription(`Prefix: \" ${prefix} \"`)
      .addFields(...possibleCommands);
    msg.reply({ embeds: [exampleEmbed] });
  }

  if (msg.content.toLowerCase().startsWith(prefix + "addword")) {
    if (!isAdmin(msg.author)) return;

    {
      const newWord = msg.content.split(" ")[2];
      if (!newWord) return;
      addForbiddenWord(newWord);

      const embed = new Discord.MessageEmbed()
        .setColor("#FEE440")
        .setTitle("New word added")
        .setDescription(newWord);
      msg.reply({ embeds: [embed] });
    }

    return;
  }

  if (msg.content.toLowerCase().startsWith(prefix + "removeword")) {
    if (!isAdmin(msg.author)) return;

    {
      const newWord = msg.content.split(" ")[2];
      if (!newWord) return;
      removeForbiddenWord(newWord);

      const embed = new Discord.MessageEmbed()
        .setColor("#FEE440")
        .setTitle("Word has been removed")
        .setDescription(newWord);
      msg.reply({ embeds: [embed] });
    }

    return;
  }

  if (msg.content.toLowerCase().startsWith(prefix + "wordlist")) {
    {
      const embed = new Discord.MessageEmbed()
        .setColor("#293462")
        .setTitle("List of banned words:")
        .setDescription(bannedWords.join("\n"));
      msg.reply({ embeds: [embed] });
    }

    return;
  }

  if (checkForbiddenWord(msg) && !isAdmin(msg.author)) {
    console.log(
      `Deleted message:\n${msg.content}\nfrom user: ${msg.author.username}`
    );
    msg.delete();

    const embed = new Discord.MessageEmbed()
      .setColor("#F32424")
      .setTitle(
        `You commited a crime and were given a timeout of ${banTime} seconds for typing:`
      )
      .setDescription(`"${msg.content}"`)
      .setFooter(`Please make sure this doesn't ever happen again.`);
    msg.author.send({ embeds: [embed] });
    bannedUsers.addBanned(msg.author, banTime);
  }
});

client.login(token);
