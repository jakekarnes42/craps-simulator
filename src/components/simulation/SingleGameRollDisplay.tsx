import { ReactNode } from 'react';
import { Badge } from 'react-bootstrap';
import { BetCollection, GameState } from '../../game/GameState';
import { BetOutcome, BetType, PlacedBet, ResolvedBet, RollResult } from '../../game/Session';
import { PressStrategy, PressStrategyType } from '../../game/PressStrategy';
import { floorDownToProperUnit } from '../../util/Util';

type SingleGameRollDisplayProps = {
  result: RollResult,
};


/**
 * Renders a Bootstrap badge to display the outcome of a bet.
 *
 * @param outcome - The outcome (WIN, LOSS, or PUSH)
 * @param payout - The payout amount (used in the badge text)
 * @returns A JSX element badge
 */
const renderOutcomeBadge = (outcome: BetOutcome, payout: number): JSX.Element => {
  switch (outcome) {
    case BetOutcome.WIN:
      return <Badge bg="success">Win (+${payout})</Badge>;
    case BetOutcome.LOSS:
      return <Badge bg="danger">Loss</Badge>;
    case BetOutcome.PUSH:
      return <Badge bg="secondary">Push (Returned ${payout})</Badge>;
  }
};

/**
 * Returns a friendly label for a placed bet.
 *
 * For NUMBER_BET type, includes the specific number.
 */
const getBetLabel = (placedBet: PlacedBet): string => {
  if (placedBet.type === BetType.NUMBER_BET) {
    return placedBet.number !== undefined
      ? `Number Bet (${placedBet.number})`
      : 'Number Bet';
  }
  return placedBet.type;
};

/**
 * Returns a React fragment representing new bets placed during the roll.
 *
 * @param newBets - Array of newly placed bets
 * @param newBankroll - The bankroll after placing these bets
 */
const representNewBets = (newBets: PlacedBet[], newBankroll: number): ReactNode => {
  if (newBets.length === 0) {
    return <p className="mb-0">No new bets placed.</p>;
  }
  return (
    <>
      {newBets.map((newBet, index) => {
        const betLabel =
          newBet.type === BetType.NUMBER_BET && newBet.number !== undefined
            ? `New ${newBet.type} (${newBet.number})`
            : `New ${newBet.type}`;
        return (
          <p className="mb-0" key={index}>
            <strong>{betLabel}:</strong> ${newBet.bet}
          </p>
        );
      })}
      <p className="mb-0">
        <strong>Bankroll after placing bets:</strong> ${newBankroll}
      </p>
    </>
  );
};

/**
 * Calculates the press details for a winning NUMBER_BET.
 *
 * This helper computes, based on the original bet, the win (payout),
 * the bet number, and the chosen press strategy, how much of the win is
 * reinvested into the bet (pressIncrease) and how much is returned to the bankroll.
 *
 * @param originalBet - The initial bet for the bet.
 * @param payoff - The win payout (amount won) for the bet.
 * @param betNumber - The number the bet is placed on (4,5,6,8,9,10).
 * @param pressStrategy - The chosen press strategy.
 * @returns An object with the pressIncrease and bankrollReturn amounts.
 */
const calculatePressDetails = (
  originalBet: number,
  payoff: number,
  betNumber: 4 | 5 | 6 | 8 | 9 | 10,
  pressStrategy: PressStrategy
): { pressIncrease: number; bankrollReturn: number } => {
  // Total value after win
  const total = originalBet + payoff;
  switch (pressStrategy.type) {
    case PressStrategyType.NO_PRESS:
      // No pressing – all winnings return to the bankroll.
      return { pressIncrease: 0, bankrollReturn: payoff };
    case PressStrategyType.PRESS_UNTIL: {
      // Press only until the bet reaches the target.
      // The target amount is stored in the strategy’s value field.
      const target = pressStrategy.value
      if (total <= target) {
        return { pressIncrease: payoff, bankrollReturn: 0 };
      } else {
        return { pressIncrease: target - originalBet, bankrollReturn: total - target };
      }
    }
    case PressStrategyType.HALF_PRESS: {
      // Half of the winnings are pressed; half returned.
      const half = payoff / 2;
      return { pressIncrease: half, bankrollReturn: payoff - half };
    }
    case PressStrategyType.FULL_PRESS:
      // Full pressing – entire win is added to the bet.
      return { pressIncrease: payoff, bankrollReturn: 0 };
    case PressStrategyType.POWER_PRESS: {
      // Press up to the next optimal casino multiple.
      const maxPossible = originalBet + payoff;
      const finalPressed = floorDownToProperUnit(maxPossible, betNumber);
      return {
        pressIncrease: finalPressed - originalBet,
        bankrollReturn: maxPossible - finalPressed,
      };
    }
    default:
      return { pressIncrease: 0, bankrollReturn: payoff };
  }
};

/**
 * Displays a single roll result including:
 * - Roll outcome (e.g., Natural, Point Hit)
 * - Bets placed before the roll, current bets, and resolved bets
 * - Press details for winning number bets (calculated on the fly)
 *
 * The display is divided into four columns: before the roll, placing bets,
 * all current bets, and roll results.
 */
export const SingleGameRollDisplay = ({ result }: SingleGameRollDisplayProps) => {
  const { initialState, newBets, placedBetState, roll, resolvedBets, resultingState } = result;

  // Determine the roll outcome label based on the game state and dice roll.
  const rollOutcomeLabel = (() => {
    if (!initialState.pointIsOn) {
      if (resultingState.pointIsOn) {
        return `Come Out Roll – Point Established (${resultingState.point})`;
      } else if ([7, 11].includes(roll)) {
        return 'Come Out Roll – Natural';
      } else if ([2, 3, 12].includes(roll)) {
        return 'Come Out Roll – Craps';
      }
      return 'Come Out Roll';
    }
    if (roll === initialState.point) {
      return 'Point Hit';
    }
    if (roll === 7) {
      return 'Seven Out';
    }
    return 'Point Roll';
  })();

  // The active status for number bets is based on whether a point is on.
  const numberBetsActive = placedBetState.pointIsOn;

  // Get the current configuration (which includes press limit and press strategy).
  const cfg = initialState.configuration;

  /**
   * Renders the collection of current bets.
   *
   * For number bets, displays the win count and, if a press limit is configured,
   * displays it as "(Wins: X / [limit])"; otherwise just "(Wins: X)".
   *
   * @param currentBets - The bet collection from the game state.
   * @param numberBetsActive - Boolean flag indicating if number bets are active.
   */
  const representBetCollection = (currentBets: BetCollection, numberBetsActive: boolean): ReactNode => {
    const { passLineBet, dontPassBet, comeBets, dontComeBets, numberBets } = currentBets;

    // Render pass line bet with odds if present.
    const passLineDisplay = passLineBet && (
      <li>
        <strong>Pass Line Bet:</strong> ${passLineBet.bet}
        {passLineBet.odds && <span> &mdash; <em>Odds:</em> ${passLineBet.odds}</span>}
      </li>
    );

    // Render don't pass bet with odds if present.
    const dontPassDisplay = dontPassBet && (
      <li>
        <strong>Don&apos;t Pass Bet:</strong> ${dontPassBet.bet}
        {dontPassBet.odds && <span> &mdash; <em>Odds:</em> ${dontPassBet.odds}</span>}
      </li>
    );

    // Render come bets.
    const comeBetItems = comeBets.map((cb, i) => (
      <li key={i}>
        <strong>Come Bet:</strong> ${cb.bet}
        {cb.comePoint && <span> &mdash; <em>Come Point:</em> {cb.comePoint}</span>}
        {cb.odds && <span> &mdash; <em>Odds:</em> ${cb.odds}</span>}
      </li>
    ));

    // Render don't come bets.
    const dontComeBetItems = dontComeBets.map((dcb, i) => (
      <li key={i}>
        <strong>Don&apos;t Come Bet:</strong> ${dcb.bet}
        {dcb.comePoint && <span> &mdash; <em>DC Point:</em> {dcb.comePoint}</span>}
        {dcb.odds && <span> &mdash; <em>Odds:</em> ${dcb.odds}</span>}
      </li>
    ));

    // Render number bets with press details.
    const numberBetItems = numberBets.map((nb, i) => {
      const pressInfo = cfg.pressLimit !== null
        ? ` (Wins: ${nb.winCount} / ${cfg.pressLimit})`
        : ` (Wins: ${nb.winCount})`;
      return (
        <li key={i}>
          <strong>Number Bet ({nb.number}){!numberBetsActive ? ' (Off)' : ''}:</strong> ${nb.bet}{pressInfo}
        </li>
      );
    });

    const hasBets =
      passLineBet || dontPassBet || comeBets.length || dontComeBets.length || numberBets.length;

    return hasBets ? (
      <ul className="mb-0">
        {passLineDisplay}
        {dontPassDisplay}
        {comeBetItems}
        {dontComeBetItems}
        {numberBetItems}
      </ul>
    ) : (
      <p className="mb-0">No active bets.</p>
    );
  };

  /**
   * Renders the resolved bets for the roll.
   *
   * For winning number bets that are not cashed out, calculates on the fly
   * how much of the win is pressed into the bet versus returned to the bankroll.
   * If the bet is cashed out (i.e. reached the press limit), the press details are omitted.
   */
  const representResolvedBets = (resolvedBets: ResolvedBet[]): ReactNode => {
    if (resolvedBets.length === 0) {
      return <p className="mb-0">No bets resolved this roll.</p>;
    }
    return (
      <>
        {resolvedBets.map((resolvedBet, index) => {
          const isCashedOut =
            resolvedBet.placedBet.type === BetType.NUMBER_BET &&
            resolvedBet.placedBet.number !== undefined &&
            resultingState.cashedOutNumbers.includes(resolvedBet.placedBet.number);

          return (
            <div key={index} className="mb-2">
              {/* Base display for the resolved bet */}
              <div>
                <strong>{getBetLabel(resolvedBet.placedBet)}</strong> &nbsp;
                (${resolvedBet.placedBet.bet}) &nbsp;
                {renderOutcomeBadge(resolvedBet.outcome, resolvedBet.payout)}
                {isCashedOut && (
                  <Badge bg="info" className="ms-1">
                    Cashed Out (Press Limit)
                  </Badge>
                )}
              </div>
              {/* Show press details for winning NUMBER_BETs if not cashed out and a press strategy is used */}
              {resolvedBet.placedBet.type === BetType.NUMBER_BET &&
                resolvedBet.outcome === BetOutcome.WIN &&
                resolvedBet.placedBet.number !== undefined &&
                !isCashedOut &&
                cfg.pressStrategy.type !== PressStrategyType.NO_PRESS && (
                  <div className="ms-3">
                    <small>
                      {(() => {
                        // Calculate press details on the fly.
                        const { pressIncrease, bankrollReturn } = calculatePressDetails(
                          resolvedBet.placedBet.bet,
                          resolvedBet.payout,
                          resolvedBet.placedBet.number,
                          cfg.pressStrategy
                        );
                        return `Press Increase: $${pressIncrease.toFixed(
                          2
                        )}, Bankroll Return: $${bankrollReturn.toFixed(2)}`;
                      })()}
                    </small>
                  </div>
                )}
            </div>
          );
        })}
      </>
    );
  };

  /**
   * Renders the current point status.
   *
   * @param state - The game state.
   */
  const renderPoint = (state: GameState): ReactNode =>
    state.pointIsOn && state.point ? (
      <p className="mb-0">
        <strong>Point is on:</strong> {state.point}
      </p>
    ) : (
      <p className="mb-0">
        <strong>Point is off.</strong>
      </p>
    );

  //
  // Main JSX layout: divided into four columns.
  //
  return (
    <div className="row border mb-3 p-3">
      {/* Row Heading: Roll number, outcome, and dice total */}
      <div className="col-12 mb-2">
        <h5 className="m-0">
          Roll #{initialState.rollNum + 1 /* the +1 makes it one-indexed */} &nbsp;
          <small className="text-muted">
            ({rollOutcomeLabel}) – Dice Total: {roll}
          </small>
        </h5>
      </div>

      {/* Column 1: Before the Roll (bankroll and current point) */}
      <div className="col-md-2 mb-2">
        <h6 className="text-primary">Before the Roll</h6>
        <p className="mb-1">
          <strong>Bankroll:</strong> ${initialState.bankroll}
        </p>
        {renderPoint(initialState)}
      </div>

      {/* Column 2: New Bets Placed */}
      <div className="col-md-3 mb-2">
        <h6 className="text-primary">Placing Bets</h6>
        {representNewBets(newBets, placedBetState.bankroll)}
      </div>

      {/* Column 3: All Current Bets */}
      <div className="col-md-4 mb-2">
        <h6 className="text-primary">All Current Bets</h6>
        {representBetCollection(placedBetState.currentBets, numberBetsActive)}
      </div>

      {/* Column 4: Roll Results */}
      <div className="col-md-3">
        <h6 className="text-primary">Roll Results</h6>
        <p className="mb-0">
          <strong>Dice Total:</strong> {roll}
        </p>
        {renderPoint(resultingState)}
        {representResolvedBets(resolvedBets)}
        <p className="mb-0">
          <strong>Bankroll after resolution:</strong> ${resultingState.bankroll}
        </p>
      </div>
    </div>
  );
};
