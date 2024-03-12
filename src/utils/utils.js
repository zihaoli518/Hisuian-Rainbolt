


const getUniqueNames = () => {
  const uniqueNames = {};
  challengeScoreHistoryArray = Object.keys(challengeScoreHistory);
  console.log(challengeScoreHistoryArray);
  challengeScoreHistoryArray.forEach((date) => {
    const ranking = challengeScoreHistory[date].ranking;
    console.log(ranking);
    ranking.forEach((obj) => {
      const name = obj.playerName;
      if (!uniqueNames[name]) uniqueNames[name] = true;
    });
  });
  console.log("unique names: ", uniqueNames);
};