import { useState, useEffect } from 'react';
import Axios from 'axios';
import { ProgressBar } from "react-bootstrap";

function phrazleStatistics({statschart}) {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth'));
    const loginuserEmail = USER_AUTH_DATA.email;
    const [totalGame, setTotalGame] = useState('');
    const [totalWin, setTotalWin] = useState('');
    const [phrazleStatsData, setphrazleStatsData] = useState();
    const [currentStreak, setcurrentStreak] = useState();
    const [maxStreak, setmaxStreak] = useState();
     const [guessDistribution, setguessDistribution] = useState();
    const [last7Streak, setLast7Streak] = useState();
    const [last7Average, setLast7Average] = useState();
    const [cumulativeAvgEntered, setCumulativeAvgEntered] = useState();
    const [cumulativeAvgInclNoPlay, setCumulativeAvgInclNoPlay] = useState();
    const [deucesAward, setDeucesAward] = useState();

    useEffect(() => {
        getStatsValue();
    }, [statschart]); // Update stats when updateStatsStatistics changes

    function getStatsValue() {
       
        Axios.get(`${baseURL}/games/phrazle/get-statistics.php?useremail=${loginuserEmail}`)
            .then((response) => {
                if (typeof updateStatistics === 'function') {
                    updateStatistics();
                }
                const statistics = response.data.statistics;
                
                setphrazleStatsData(statistics);
                setTotalGame(statistics.totalGamesPlayed);
                setTotalWin(statistics.winPercentage);
                setcurrentStreak(statistics.currentStreak);
                setmaxStreak(statistics.maxStreak);
                setguessDistribution(statistics.guessDistribution);
                setLast7Streak(statistics.last7Streak);
                setLast7Average(statistics.last7Average);
                setCumulativeAvgEntered(statistics.cumulativeAvgEntered);
                setCumulativeAvgInclNoPlay(statistics.cumulativeAvgInclNoPlay);
                setDeucesAward(statistics.deucesAward);
            })
            .catch((error) => {
                console.error("Error fetching data: ", error);
                
            });
    }

    const WinningPercent = Math.round((totalWin / totalGame) * 100);
    const isValidNumber = !isNaN(WinningPercent);
    return (
        <div className="statistics">
            <h2 className='text-uppercase'>Statistics</h2>
    
            {phrazleStatsData ? (
                <>
                    <ul>
                        <li>
                            <div className='value'>{totalGame}</div>
                            <div className='bottom-text'>Games Played</div>
                        </li>
                        <li>
                            <div className='value'>{totalWin}</div>
                            <div className='bottom-text'>Win %</div>
                        </li>
                        <li>
                            <div className='value'>{currentStreak}</div>
                            <div className='bottom-text'>Current Streak</div>
                        </li>
                        <li>
                            <div className='value'>{maxStreak}</div>
                            <div className='bottom-text'>Max Streak</div>
                        </li>
                    </ul>

                    <ul>
                        <li>
                            <div className='value'>{last7Streak}</div>
                            <div className='bottom-text'>Last 7 Streak</div>
                        </li>
                        <li>
                            <div className='value'>{last7Average}</div>
                            <div className='bottom-text'>Last 7 Average</div>
                        </li>
                        <li>
                            <div className='value'>{cumulativeAvgEntered}</div>
                            <div className='bottom-text'>Cumulative Avg. Entered</div>
                        </li>
                        <li>
                            <div className='value'>{cumulativeAvgInclNoPlay}</div>
                            <div className='bottom-text'>Cumulative Avg. (incl. No Play)</div>
                        </li>
                    </ul>

                    <ul className="justify-content-center">
                        <li>
                            <div className='value'>{deucesAward}</div>
                            <div className='bottom-text'>Deuces Awards</div>
                        </li>
                    </ul>

                    <div className="guess-distribution my-4">
                        <h2 className="text-uppercase">Distribution</h2>
                        {Object.entries(guessDistribution).map(([guess, count]) => {
                            const total = Object.values(guessDistribution).reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? (count / total) * 100 : 0;

                            return (
                                <div key={guess} className="mb-2">
                                <div className="d-flex align-items-center">
                                  {/* Guess Number */}
                                  <div className='text-end' style={{ width: "15%", textAlign: "center", fontWeight: "bold" }}>
                                    {guess}
                                  </div>
                              
                                  {/* Progress Bar */}
                                  <div style={{ width: "75%", margin: "0 10px", position: "relative" }}>
                                    <ProgressBar
                                        className="phrazle-progress-bar"
                                        now={percent}
                                        label=""
                                    />
                                    <span className="progress-label">{count > 0 ? count : ''}</span>
                                    </div>
                              
                                  {/* Percentage */}
                                  <div style={{ width: "5%", textAlign: "right", fontSize: "0.9rem" }}>
                                    {`${percent.toFixed(0)}%`}
                                  </div>
                                </div>
                              </div>
                              
                            );
                        })}
                        </div>

                </>
            ) : (
                <div>Data Not Found</div>
            )}
        </div>
    );
}

export default phrazleStatistics;
