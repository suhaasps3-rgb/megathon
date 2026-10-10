export const scenarios = {
  gaming: {
    title: "The Ultimate Setup",
    theme: "Gaming",
    setup: "You have ₹1000. Let's see how you balance immediate gaming desires with your financial future.",
    decisions: [
      {
        text: "Your favorite game just released a limited-time legendary skin for ₹200. All your friends are buying it.",
        choices: [
          {
            text: "Buy it immediately. It's limited edition!",
            cost: 200,
            futureImpact: 0,
            feedback: "You got the skin, but you just spent 20% of your budget on a 'want'.",
            isGood: false
          },
          {
            text: "Skip it. The base game is fun enough.",
            cost: 0,
            futureImpact: 431,
            feedback: "Great self-control! You kept the money, giving it potential to grow.",
            isGood: true
          }
        ]
      },
      {
        text: "You have some money saved. Your older cousin suggests starting a SIP (Systematic Investment Plan) instead of leaving it in your drawer.",
        choices: [
          {
            text: "Keep it in the drawer. It's safer.",
            cost: 0,
            futureImpact: 200,
            concept: {
              name: "Inflation Risk",
              description: "Inflation is the rate at which prices rise over time, meaning your money loses purchasing power if it doesn't grow.",
              example: "If a movie ticket costs ₹200 today, inflation might push it to ₹220 next year. Cash in a drawer stays at ₹200, so you can no longer afford the ticket."
            },
            feedback: "Cash feels safe, but over time, 'Inflation' makes things more expensive, meaning your drawer money loses its buying power.",
            isGood: false
          },
          {
            text: "Start a Mutual Fund SIP.",
            cost: 0,
            futureImpact: 431,
            concept: {
              name: "SIPs & Mutual Funds",
              description: "A Mutual Fund pools money from many people to invest in stocks/bonds. A SIP (Systematic Investment Plan) lets you automate small, regular investments into it.",
              example: "Instead of trying to buy one expensive stock, your ₹200 SIP buys tiny fractions of the top 50 companies in India, spreading out your risk."
            },
            feedback: "Smart! A Mutual Fund pools money to buy a diversified mix of assets. A SIP lets you invest small amounts automatically, lowering risk over time.",
            isGood: true
          }
        ]
      },
      {
        text: "Someone in your Discord server DMs you saying they can double your money in 24 hours if you send it to their crypto wallet.",
        choices: [
          {
            text: "Send them ₹500. It's a huge opportunity!",
            cost: 500,
            futureImpact: 0,
            concept: {
              name: "Too Good To Be True (Scams)",
              description: "Fraudsters often prey on greed by promising guaranteed, incredibly high returns with zero risk. In finance, high returns always come with high risk.",
              example: "Any message claiming to 'double your money in 24 hours' or 'guaranteed risk-free crypto' is a scam. Legitimate investments take time to grow."
            },
            feedback: "You got scammed! If it sounds too good to be true, it almost always is. Never send money to unverified strangers online.",
            isGood: false
          },
          {
            text: "Ignore and block them.",
            cost: 0,
            futureImpact: 0,
            concept: {
              name: "Digital Security",
              description: "Protecting your financial assets requires skepticism and verifying the identity of anyone asking for money or access.",
              example: "Blocking random DMs offering financial advice or crypto trades prevents social engineering attacks from succeeding."
            },
            feedback: "Great job! You protected your identity and your wallet. Always be skeptical of 'get rich quick' schemes.",
            isGood: true
          }
        ]
      }
    ]
  },
  default: {
    title: "Life Happens",
    theme: "General",
    setup: "You have ₹1000. Let's see how you manage everyday choices and long-term wealth.",
    decisions: [
      {
        text: "You are feeling hungry while walking home. There's a fast-food joint nearby.",
        choices: [
          {
            text: "Buy a combo meal for ₹250.",
            cost: 250,
            futureImpact: 0,
            concept: {
              name: "Opportunity Cost",
              description: "The potential benefit you lose when you choose one alternative over another.",
              example: "By choosing the ₹250 pizza now, the opportunity cost is the ₹539 that money could have grown into over 10 years."
            },
            feedback: "Eating out is convenient, but cooking at home saves a lot of money.",
            isGood: false
          },
          {
            text: "Wait 20 mins and eat food at home.",
            cost: 0,
            futureImpact: 539,
            concept: {
              name: "Delayed Gratification",
              description: "The ability to resist the temptation for an immediate smaller reward in order to receive a larger or more enduring reward later.",
              example: "Waiting 20 minutes to eat at home means you keep your ₹250, which helps you hit your savings goal for that new laptop much faster."
            },
            feedback: "Good choice! Delaying gratification keeps your money working for you.",
            isGood: true
          }
        ]
      },
      {
        text: "You want to invest your saved money. You heard a random influencer say to put everything into a new 'DogeRocket' crypto coin.",
        choices: [
          {
            text: "Put it all in DogeRocket! To the moon!",
            cost: 0,
            futureImpact: 0,
            concept: {
              name: "Concentration Risk",
              description: "The danger of losing everything because all your money is invested in a single asset or idea.",
              example: "If DogeRocket crashes to zero, you lose 100% of your money. This is why investors 'don't put all their eggs in one basket'."
            },
            feedback: "Ouch. The coin crashed. Putting all your money in one high-risk asset violates the rule of 'Diversification' (don't put all eggs in one basket).",
            isGood: false
          },
          {
            text: "Invest in a diversified Index Mutual Fund.",
            cost: 0,
            futureImpact: 431,
            concept: {
              name: "Diversification",
              description: "A risk management strategy that mixes a wide variety of investments within a portfolio.",
              example: "An Index Fund buys a tiny piece of the top 50 companies in the country. If one company fails, the other 49 can still keep your money growing."
            },
            feedback: "Perfect! An Index Fund spreads your money across top companies, diversifying your risk and giving steady compounding returns.",
            isGood: true
          }
        ]
      },
      {
        text: "You get an email saying your bank account is locked and you need to click a link to enter your password to unlock it.",
        choices: [
          {
            text: "Click the link and enter my password quickly!",
            cost: 0,
            futureImpact: 0,
            concept: {
              name: "Phishing Scams",
              description: "A cyber attack where scammers disguise themselves as a trustworthy entity to steal sensitive information like passwords.",
              example: "The link in the email goes to 'hdfc-bank-update.com' instead of the real 'hdfcbank.com'. Once you type your password there, the scammers capture it."
            },
            feedback: "Oh no! That was a Phishing email. Scammers just stole your login info. Banks will never ask for your password via a random link.",
            isGood: false
          },
          {
            text: "Close the email and call the bank directly.",
            cost: 0,
            futureImpact: 0,
            concept: {
              name: "Verification",
              description: "The process of independently confirming information through an official, trusted channel.",
              example: "Instead of clicking the email link, manually typing the bank's official website or calling the number on the back of your debit card verifies the truth."
            },
            feedback: "Excellent! You spotted a classic phishing attempt and protected your sensitive information.",
            isGood: true
          }
        ]
      }
    ]
  }
};
// Add alias for others to fallback to default
scenarios.sports = scenarios.default;
scenarios.tech = scenarios.default;
scenarios.art = scenarios.default;
scenarios.music = scenarios.default;
scenarios.movies = scenarios.default;
