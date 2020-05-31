import * as speakerdeck from "@src/speakerdeck";

process.setMaxListeners(0);

export const exec = async (userID: string) => {
  const decks = await speakerdeck.decks(userID);

  await Promise.all(
    decks.map(async (deck) => {
      speakerdeck.mkdir(deck);
      await speakerdeck.downloadDeck(deck);

      console.info(` \u001b[32m ${deck.title}`);
    }),
  );

  console.info(" \u001b[32m Success");
};

const userIDKeyValue = process.argv.join().match(/userID=\S*/);
if (userIDKeyValue && userIDKeyValue.length === 1) {
  const userID = userIDKeyValue[0].replace("userID=", "").replace(/,\S*/, "");

  console.info(` export userID:${userID}`);
  exec(userID);
} else {
  console.error(' \u001b[31m please "npm run export userID=igara"');
}
