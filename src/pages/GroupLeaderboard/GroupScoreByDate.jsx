import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { useParams, useSearchParams  } from "react-router-dom";
import axios from 'axios';
import { Button, Alert, Row, Col, ProgressBar, Modal  } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment-timezone';
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import dayjs from "dayjs";
import GetGroupMessagesModal from '../../constant/Models/GetGroupMessagesModal';

function GroupScoreByDate({ latestJoinDate, setSelectedMember, setShowProfile, msgReportDate, msgPeriod}) {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const { id, groupName, game } = useParams();
    // A notification for a past game period should land the user right on
    // that date's Daily Leaderboard below, not leave them looking at
    // Today's Leaderboard further up the page (which doesn't apply to a
    // past date). Scrolls once per distinct notification (identified by
    // group/game/date/period) once this section's data for the requested
    // date finishes loading - clicking a different notification afterward
    // (without a full page reload, since React Router reuses this same
    // mounted component across param changes) still triggers its own
    // scroll, while manual date navigation within this section does not.
    const dailyLeaderboardRef = useRef(null);
    const scrolledForKeyRef = useRef(null);
    const scrollToDailyLeaderboardIfNeeded = () => {
        const key = msgReportDate ? `${id}|${game}|${msgReportDate}|${msgPeriod ?? ""}` : null;
        if (key && scrolledForKeyRef.current !== key) {
            scrolledForKeyRef.current = key;
            setTimeout(() => {
                dailyLeaderboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    };
    const [todayLeaderboard, setTodayLeaderboard] = useState([]);
    // Weekly Leaderboard - part of the Daily/Weekly/Monthly/Yearly revamp
    // replacing the old "forever" Cumulative Leaderboard. weeklyData holds
    // the full API response (data, weekOf, canGoBack/Forward, available).
    const [weeklyData, setWeeklyData] = useState(null);
    const fetchWeeklyData = async (weekOf) => {
        if (!id || !game) return;
        try {
            const params = { groupId: id, game };
            if (weekOf) params.weekOf = weekOf;
            const res = await axios.get(`${baseURL}/groups/get-weekly-score.php`, { params });
            setWeeklyData(res.data);
        } catch (err) {
            setWeeklyData(null);
        }
    };
    useEffect(() => {
        fetchWeeklyData(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, game]);
    const goToPreviousWeek = () => {
        if (!weeklyData?.canGoBack) return;
        fetchWeeklyData(dayjs(weeklyData.weekOf).subtract(7, 'day').format('YYYY-MM-DD'));
    };
    const goToNextWeek = () => {
        if (!weeklyData?.canGoForward) return;
        fetchWeeklyData(dayjs(weeklyData.weekOf).add(7, 'day').format('YYYY-MM-DD'));
    };
    // Monthly Leaderboard - same pattern as Weekly above.
    const [monthlyData, setMonthlyData] = useState(null);
    const fetchMonthlyData = async (monthOf) => {
        if (!id || !game) return;
        try {
            const params = { groupId: id, game };
            if (monthOf) params.monthOf = monthOf;
            const res = await axios.get(`${baseURL}/groups/get-monthly-score.php`, { params });
            setMonthlyData(res.data);
        } catch (err) {
            setMonthlyData(null);
        }
    };
    useEffect(() => {
        fetchMonthlyData(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, game]);
    const goToPreviousMonth = () => {
        if (!monthlyData?.canGoBack) return;
        fetchMonthlyData(dayjs(monthlyData.monthOf).subtract(1, 'month').format('YYYY-MM-DD'));
    };
    const goToNextMonth = () => {
        if (!monthlyData?.canGoForward) return;
        fetchMonthlyData(dayjs(monthlyData.monthOf).add(1, 'month').format('YYYY-MM-DD'));
    };
    // Yearly Leaderboard - same pattern as Weekly/Monthly, except it's
    // always available (the current year shows as "Year To Date" from day
    // one, rather than waiting for a complete period like Weekly/Monthly).
    const [yearlyData, setYearlyData] = useState(null);
    const fetchYearlyData = async (yearOf) => {
        if (!id || !game) return;
        try {
            const params = { groupId: id, game };
            if (yearOf) params.yearOf = yearOf;
            const res = await axios.get(`${baseURL}/groups/get-yearly-score.php`, { params });
            setYearlyData(res.data);
        } catch (err) {
            setYearlyData(null);
        }
    };
    useEffect(() => {
        fetchYearlyData(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, game]);
    const goToPreviousYear = () => {
        if (!yearlyData?.canGoBack) return;
        fetchYearlyData(yearlyData.year - 1);
    };
    const goToNextYear = () => {
        if (!yearlyData?.canGoForward) return;
        fetchYearlyData(yearlyData.year + 1);
    };
    const [missedScore, setMissedScore] = useState([]);
    const [dataFetched, setDataFetched] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [dataFetchedError, setFetchedError] = useState(false);
    const [scoringMethod, setscoringMethod] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [dayResults, setDayResults] = useState(null);
    const [selectedGame, setSelectedGame] = useState("");
    const [period, setPeriod] = useState('');
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth'));
    const userId = USER_AUTH_DATA?.id;
    const loginuserEmail = USER_AUTH_DATA?.email;
    //const formattedDate = latestJoinDate.slice(0, 10);
    const formattedDateStr = latestJoinDate ? latestJoinDate.slice(0, 10) : null;
    const date = new Date(latestJoinDate);
    const hours = date.getHours();
    const groupPeriod = hours < 12 ? "AM" : "PM";
    const [searchParams, setSearchParams] = useSearchParams();
    let minDate = new Date(); // fallback

    if (formattedDateStr && typeof formattedDateStr === 'string') {
        const parts = formattedDateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                // Build this as a LOCAL midnight, not UTC. A UTC-constructed
                // date, once handed to the DatePicker (which compares against
                // local calendar days), lands on the previous local day for
                // any viewer west of UTC - letting the calendar go back one
                // day further than the back-arrow button (which compares
                // against latestJoinDate in local time) allows.
                minDate = new Date(year, month - 1, day);
            } else {
                console.error('Invalid date parts:', { year, month, day });
            }
        } else {
            console.error('Unexpected date format:', formattedDateStr);
        }
    }


    useEffect(() => {
        const fetchscoringMethod = async () => {
            try {
                const res = await axios.get(`${baseURL}/groups/get-scoring-method.php`, {
                    params: { user_id: userId, group_id: id }
                });

                if (res.data.status == "success") {
                    
                    setscoringMethod(res.data.scoring_method); // Default to empty string
                } else {
                    toast.error("Scoring Method not found.");
                }
            } catch (err) {
                toast.error("Failed to load group info.");
            }
        };

        if (id && userId) {  
            fetchscoringMethod();
        }
    }, [id, userId]); 

    const formatDateForBackend = (date) => {
        if (!date) return "";
        const m = moment(date);
        if (!m.isValid()) return "";
        return m.format("YYYY-MM-DD");
    };
   
    const handleDateChange = (date) => {
       
        if (!date || isNaN(date.getTime())) return;

        const formattedDateStr = formatDateForBackend(date); // "YYYY-MM-DD"

        if (game === 'phrazle') {
            const selectedDay = dayjs(date).format("YYYY-MM-DD");
            const joinDay = dayjs(latestJoinDate).format("YYYY-MM-DD");
            const joinHour = dayjs(latestJoinDate).hour();

            let newPeriod;

            if (selectedDay === joinDay) {
                // Same day as latest join
                newPeriod = joinHour >= 12 ? "PM" : "AM";
            } else if (dayjs(date).isAfter(dayjs(latestJoinDate), 'day')) {
                // Selected a future date → default to "AM"
                newPeriod = "AM";
            } else {
                // Selected a past date — use custom rule or fallback
                newPeriod = "PM";
            }

            fetchDataByDate(formattedDateStr, newPeriod);
            setStartDate(date);
            setPeriod(newPeriod);
        } else {
            setStartDate(date);
            fetchDataByDate(formattedDateStr);
        }
    };


    const showDayResult = (date, useremail, game, period) => {
        const formattedDate = moment(date).format("YYYY-MM-DD");
        const timeZone = moment.tz.guess();
        const params = { useremail, timeZone, today: formattedDate };

        if (game === "phrazle") {
            params.period = period;
        }

        axios.get(`${baseURL}/games/${game}/get-score.php`, { params })
            .then((response) => {
                let scoreData = [];

                if (game === "wordle") {
                    scoreData = response.data?.wordlescore || [];
                } else if (game === "connections") {
                    scoreData = response.data?.connectionsscore || [];
                } else if (game === "phrazle") {
                    scoreData = response.data?.phrazlescore || [];
                }
                else if (game === "quordle") {
                    scoreData = response.data?.quordlescore || [];
                }
                else if (game === "octordle") {
                    scoreData = response.data?.octordlescore || [];
                }

                setDayResults(scoreData);
                setShowModal(true);
            })
            .catch((error) => {
                console.error(`API Error for ${game}:`, error);
            });
    };

    const removeMsgPeriod = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("msgReportDate");
        params.delete("msgPeriod");
        setSearchParams(params);
    };

    const goToPreviousDay = () => {
       
        const prevDate = dayjs(startDate).subtract(1, 'day').toDate();
        const latest = dayjs(latestJoinDate);
        const latestDateOnly = latest.startOf('day');
        
        if (game === 'phrazle') {
            if (period === 'PM') {
                const newPeriod = 'AM';
                const formattedDateStr = formatDateForBackend(startDate);
    
                // Allow same-day AM if latestJoinDate is within that same day
                if (dayjs(startDate).isBefore(latestDateOnly)) return;
    
                setPeriod(newPeriod);
                setStartDate(startDate);
                fetchDataByDate(formattedDateStr, newPeriod);
                
            } else {
                // Going from AM ➝ PM of previous day
                if (dayjs(prevDate).isBefore(latestDateOnly)) return;
                const newPeriod = 'PM';
                const formattedDateStr = formatDateForBackend(prevDate);
                setStartDate(prevDate);
                setPeriod(newPeriod);
                fetchDataByDate(formattedDateStr, newPeriod);
            }
        } else {
            if (dayjs(prevDate).isBefore(latestDateOnly)) return;
     
            handleDateChange(prevDate);
        }
    };
  
    const goToNextDay = () => {
        const now = dayjs();
        const today = now.startOf('day');
        const currentHour = now.hour();
        
        if (game === 'phrazle') {
            const isToday = dayjs(startDate).isSame(today, 'day');

            if (period === 'AM') {
                if (isToday && currentHour < 12) {
                    // Before 12 PM today → block PM
                    return;
                }

                // Move from AM to PM (same date)
                const formattedDate = formatDateForBackend(startDate);
                fetchDataByDate(formattedDate, 'PM');
                setPeriod('PM');
            } else {
                // Trying to move past today — block it
                if (isToday) return;

                // Move to next day AM
                const nextDate = dayjs(startDate).add(1, 'day');
                const formattedDate = formatDateForBackend(nextDate.toDate());
                fetchDataByDate(formattedDate, 'AM');
                setStartDate(nextDate.toDate());
                setPeriod('AM');
            }
        } else {
            // Non-Phrazle logic: allow only up to yesterday
            const nextDate = dayjs(startDate).add(1, 'day');
            if (nextDate.isSame(today) || nextDate.isAfter(today)) return;

            const formattedDate = formatDateForBackend(nextDate.toDate());
            fetchDataByDate(formattedDate);
            setStartDate(nextDate.toDate());
        }
    };

    const ExampleCustomInput = forwardRef(({ value, onClick }, ref) => {
        const parsedDate = dayjs(value, "DD-MM-YYYY");
        return (
            <>
                <Button className={`example-custom-input px-5 my-4 ${game}-btn`} onClick={onClick} ref={ref}>
                    Go To Date
                </Button>
            </>
        );
    });
    
    // helper used in both places
    const isMsgPeriodNull = (p) => p === null || p === undefined || p === "null";

    // ------------------ useEffect ------------------
//     useEffect(() => {
//   if (!scoringMethod || !game) return;

//   // If msgReportDate exists → ALWAYS use it directly
//   if (msgReportDate) {
//     const parsed = dayjs(msgReportDate, "YYYY-MM-DD", true);

//     if (parsed.isValid()) {
//       const finalDate = parsed.toDate();
//       const finalDateStr = formatDateForBackend(finalDate);

//       if (game === "phrazle") {
//         // Use msgPeriod directly (no shifting, no auto logic)
//         const finalPeriod = msgPeriod || "AM"; 
        
//         setStartDate(finalDate);
//         setPeriod(finalPeriod);
//         fetchDataByDate(finalDateStr, finalPeriod);
//       } else {
//         // WORDLE + CONNECTIONS → no period
//         setStartDate(finalDate);
//         fetchDataByDate(finalDateStr);
//       }
//       return; // STOP HERE → prevents auto adjustments
//     }
//   }
useEffect(() => {
  if (!scoringMethod || !game) return;

  const now = dayjs();
  const today = now.toDate();

  let finalDate;
  let finalPeriod;

  // ----------------------------------
  // PHRAZLE LOGIC
  // ----------------------------------
  if (game === "phrazle") {

    /* ----------------------------------
       DEFAULT PHRAZLE RULE
       Morning   → yesterday PM
       Afternoon → today AM
    ---------------------------------- */
    if (now.hour() < 12) {
      finalDate = now.subtract(1, "day").startOf("day").toDate();
      finalPeriod = "PM";
    } else {
      finalDate = now.startOf("day").toDate();
      finalPeriod = "AM";
    }

    /* ----------------------------------
       URL OVERRIDE (msgReportDate)
       - PM → msgPeriod === "PM"
       - AM → msgPeriod is undefined
    ---------------------------------- */
    if (msgReportDate) {
      finalDate = dayjs(msgReportDate, "YYYY-MM-DD").startOf("day").toDate();

      if (msgPeriod === "PM") {
        // PM message → show SAME date PM stats
        finalPeriod = "PM";
      } else {
        // AM message → show SAME date AM stats
        finalPeriod = "AM";
      }
    }

    const finalDateStr = formatDateForBackend(finalDate);

    setStartDate(finalDate);
    setPeriod(finalPeriod);
    fetchDataByDate(finalDateStr, finalPeriod);
    return;
  }
  else{
    // ----------------------------------
    // NON-PHRAZLE GAMES
    // ----------------------------------
    if (msgReportDate) {
        finalDate = dayjs(msgReportDate, "YYYY-MM-DD").startOf("day").toDate();
        const finalDateStr = formatDateForBackend(finalDate);
        setStartDate(finalDate);
        setPeriod(finalPeriod);
        fetchDataByDate(finalDateStr, finalPeriod);
    }
    else{
        const defaultDate = dayjs().subtract(1, "day").startOf("day").toDate();
        const defaultDateStr = formatDateForBackend(defaultDate);
        setStartDate(defaultDate);
        fetchDataByDate(defaultDateStr);
    }
  }

}, [scoringMethod, game, msgReportDate, msgPeriod]);




    // ------------------ fetchDataByDate ------------------
    const fetchDataByDate = async (date, currentPeriod = null) => {
    try {
        const timeZone = moment.tz.guess();

        // normalize source: prefer msgReportDate if present, else use provided startDate
        const baseDay = msgReportDate ? dayjs(msgReportDate, "YYYY-MM-DD", true) : dayjs(startDate);
        let finalDay = baseDay.isValid() ? baseDay.clone() : dayjs(startDate);
        let finalPeriod = msgPeriod;


        // if (game === "phrazle") {
        //     // apply the same exact mapping here to be consistent with useEffect
        //     if (msgReportDate) {
        //         // If msgPeriod is PM => same date, AM
        //         if (msgPeriod === "PM") {
        //         finalPeriod = "AM";
        //         // finalDay unchanged
        //         }
        //         // If msgPeriod is AM => previous date, AM
        //         else if (msgPeriod === "AM") {
        //         finalDay = finalDay.subtract(1, "day");
        //         finalPeriod = "AM";
        //         }
        //         // if msgPeriod nullish => let finalDay/finalPeriod remain as-is (or you can choose defaults)
        //     } else {
        //         // no msgReportDate: use current logic (defaults based on time of day)
        //         const now = dayjs();
        //         if (now.hour() < 12) {
        //         finalDay = now.subtract(1, "day");
        //         finalPeriod = "PM";
        //         } else {
        //         finalDay = now;
        //         finalPeriod = "AM";
        //         }
        //     }
        //     } else {
        //     // Non-phrazle: if msgPeriod explicitly 'null' => previous date
        //     if (isMsgPeriodNull(msgPeriod)) {
        //         finalDay = finalDay.subtract(1, "day");
        //     }
        // }

        const finalDateStr = formatDateForBackend(finalDay.toDate());

        

        // Build params (same as you had)
        const baseParams = {
        groupId: id,
        groupName,
        game,
        groupCreatedDate: formattedDateStr,
        groupPeriod: groupPeriod,
        today: date,
        timeZone,
        formattedYesterday: finalDateStr,
        scoringMethod
        };

        const params = game === "phrazle"
        ? { ...baseParams, period: currentPeriod || finalPeriod }
        : baseParams;

        const todayResponse = await axios.get(`${baseURL}/groups/get-group-score.php`, { params });

        if (todayResponse.data.status === "success" && Array.isArray(todayResponse.data.data)) {
        setTodayLeaderboard(todayResponse.data.data);
        } else {
        setTodayLeaderboard([]);
        setFetchedError(true);
        }

        setDataFetched(true);
        scrollToDailyLeaderboardIfNeeded();
    } catch (error) {
        console.error("API Error:", error);
        setTodayLeaderboard([]);
        setFetchedError(true);
        setDataFetched(true);
        scrollToDailyLeaderboardIfNeeded();
    }
    };

    

    // Function to get the max possible score for a game
    const getTotalScore = (gameName) => {
        const cleanedName = gameName ? gameName.trim().toLowerCase() : "";
        return cleanedName === "wordle" ? 8 :
            cleanedName === "connections" ? 5 :
            cleanedName === "phrazle" ? 8 :
            cleanedName === "quordle" ? 35 :
            cleanedName === "octordle" ? 113 :
            1; // Default to 1 if unknown
    };




    const handleCloseModal = () => {
        setShowModal(false);
        // if (updated) fetchGroupInfo();
    };

    const now = new Date();

    let maxSelectableDate;

    if (game === "phrazle") {
    const isAfternoon = now.getHours() >= 12;

    maxSelectableDate = isAfternoon
        ? new Date() // allow today, local time
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); // yesterday local midnight
    } else {
    // For other games, only allow up to yesterday local midnight
    maxSelectableDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    }

    


    const handleShowProfile = (data) => {
        setSelectedMember(data);
        setShowProfile(true);
    };

    function splitIntoRowsByNewline(text) {
        const cleanedData = text.trim();
        const rows = cleanedData.split(/\n+/);
        return rows.map(row => row.replace(/\s+/g, ' ').trim());
    }
    function splitIntoRowsByLength(inputString, rowLength) {
        const rows = [];
        const charArray = Array.from(inputString); // Convert string to array of characters
        for (let i = 0; i < charArray.length; i += rowLength) {
            rows.push(charArray.slice(i, i + rowLength).join(' '));
        }
        return rows;
    }

    const noDataMessage = {
    wordle: "Gamle Score 7",
    connections: "Gamle Score 4",
    phrazle: "Gamle Score 7",
    quordle: "Gamle Score 35",
    octordle: "Gamle Score 113"
    }[game] || "No data available.";

    
   // COMMON date/time
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Helper
    const formatLocalDateTime = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
            + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    let todayFormatted = "";
    let yesterdayFormatted = "";

    if (game === "phrazle") {
        // Send pure date only
        todayFormatted = dayjs(startDate).format("YYYY-MM-DD"); 
        yesterdayFormatted = "";
    } else {
        todayFormatted = formatLocalDateTime(today);
        yesterdayFormatted = formatLocalDateTime(yesterday);
    }


 





    
    return (
        <>
            <div className='text-center'>
                {/* <DatePicker
                    selected={startDate}
                    onChange={handleDateChange}
                    customInput={<ExampleCustomInput />}
                    dateFormat="dd-MM-yyyy"
                    maxDate={new Date()}
                /> */}
                <DatePicker
                   
                    onChange={handleDateChange}
                    customInput={<ExampleCustomInput />}
                    minDate={minDate}
                    maxDate={game === 'phrazle' ? maxSelectableDate : dayjs().subtract(1, 'day').toDate()}
                    />
            </div>
            <Row
                className="justify-content-center leaderboard"
                id={
                msgReportDate
                    ? msgPeriod === "AM"
                    ? `report-${msgReportDate}-AM`
                    : msgPeriod === "PM"
                        ? `report-${msgReportDate}-PM`
                        : `report-${msgReportDate}`
                    : ""
                }

                >
                <Col md={5} className="text-center">
                    {dataFetched && todayLeaderboard.length > 0 ? (
                        <>
                        {todayLeaderboard.length > 0 && (() => {
                            // Filter out only "phrazle" and valid players
                            const filteredLeaderboard = todayLeaderboard.filter((data) => data.gamename === "phrazle" && String(data?.is_paused) === "0");
                            if (filteredLeaderboard.length === 0) return null;

                            const minScore = Math.min(
                                ...filteredLeaderboard.map(data => 
                                    Number(data.gamlescore ?? getTotalScore(data.gamename))
                                )
                            );

                            const winners = filteredLeaderboard.filter(data => 
                                Number(data.gamlescore ?? getTotalScore(data.gamename)) === minScore
                            );

                            const validYesterdayScores = filteredLeaderboard.filter(d => d.previous_gamlescore !== undefined && d.previous_gamlescore !== null);
                            const minScoreYesterday = validYesterdayScores.length > 0
                                ? Math.min(...validYesterdayScores.map(d => Number(d.previous_gamlescore)))
                                : null;

                            const priorSheriffUsernames = validYesterdayScores
                                .filter(d => Number(d.previous_gamlescore) === minScoreYesterday)
                                .map(d => d.username);

                            // Sheriff logic — only 1 sheriff
                            let sheriffWinners = [];
                            if (winners.length === 1) {
                                sheriffWinners = [winners[0]];
                            } else {
                                const repeatingSheriffs = winners.filter(w => priorSheriffUsernames.includes(w.username));
                                if (repeatingSheriffs.length > 0) {
                                    sheriffWinners = [repeatingSheriffs[0]];
                                } else {
                                    const beatAllSheriffs = winners.filter(w => {
                                        return priorSheriffUsernames.every(p => {
                                            const prior = validYesterdayScores.find(x => x.username === p);
                                            return prior && Number(w.gamlescore ?? 7) < Number(prior.previous_gamlescore ?? 7);
                                        });
                                    });

                                    if (beatAllSheriffs.length === 1) {
                                        sheriffWinners = [beatAllSheriffs[0]];
                                    } else if (priorSheriffUsernames.length === 0) {
                                        sheriffWinners = [winners[0]];
                                    }
                                }
                            }

                            const isSheriff = (username) =>
                            todayLeaderboard.some(user => user.username === username && user.sheriff === true);

                            const latest = dayjs(latestJoinDate);
                            const latestDateOnly = latest.startOf('day');
                            const joinPeriod = latest.hour() < 12 ? 'AM' : 'PM';

                            // Minimum limit for backward navigation
                            const isMinPhrazleDate =
                                (period === 'AM' && dayjs(startDate).isSame(latestDateOnly, 'day') && joinPeriod === 'AM') ||
                                (period === 'PM' && dayjs(startDate).isSame(latestDateOnly, 'day') && joinPeriod === 'PM');

                            const now = dayjs();
                            const currentHour = now.hour();

                            let maxDateKey = '';
                            if (currentHour < 12) {
                            // Before noon → max = yesterday PM
                            const maxDate = now.subtract(1, 'day').format('YYYY-MM-DD');
                            maxDateKey = `${maxDate}-PM`;
                            } else {
                            // After noon → max = today AM
                            const maxDate = now.format('YYYY-MM-DD');
                            maxDateKey = `${maxDate}-AM`;
                            }

                            // Selected key
                            const selectedDateStr = dayjs(startDate).format('YYYY-MM-DD');
                            const selectedKey = `${selectedDateStr}-${period}`;

                            // Disable if selected date-period is same or after max allowed
                            const isMaxPhrazleDate = selectedKey >= maxDateKey;

                            // const isMaxPhrazleDate = (period === 'AM' && dayjs(startDate).isSame(dayjs(), 'day'));
                            return (
                                <div ref={dailyLeaderboardRef}>
                                <div className="d-flex align-items-center justify-content-center gap-3 cursor-pointer text-lg font-medium">
                                    <button onClick={(e) => { e.stopPropagation(); goToPreviousDay(); }} disabled={isMinPhrazleDate} className="bg-dark text-white px-3 py-1 rounded">
                                        <FaArrowLeft />
                                    </button>
                                    <div>
                                        {dayjs(startDate).format("MMM D, YYYY")} - {period}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); goToNextDay(); }} disabled={isMaxPhrazleDate} className="bg-dark text-white px-3 py-1 rounded">
                                        <FaArrowRight />
                                    </button>
                                </div>
                                <h4 className="text-center py-3">Daily Leaderboard</h4>

                                {filteredLeaderboard.slice().sort((a, b) => {
                                    const aIsSheriff = isSheriff(a.username) ? 1 : 0;
                                    const bIsSheriff = isSheriff(b.username) ? 1 : 0;
                                    if (aIsSheriff !== bIsSheriff) return bIsSheriff - aIsSheriff;

                                    const aScore = Number(a.gamlescore ?? getTotalScore(a.gamename));
                                    const bScore = Number(b.gamlescore ?? getTotalScore(b.gamename));

                                    const allLost = minScore === 7;

                                    const isSingleWinnerA = winners.length === 1 && winners[0].username === a.username;
                                    const isSharedWinnerA = winners.length > 1 && winners.some(w => w.username === a.username);
                                    const worldCupScoreA = allLost ? 0 : (isSingleWinnerA ? 3 : isSharedWinnerA ? 1 : 0);
                                    const pesceScoreA = isSheriff(a.username) ? 1 : 0;

                                    const isSingleWinnerB = winners.length === 1 && winners[0].username === b.username;
                                    const isSharedWinnerB = winners.length > 1 && winners.some(w => w.username === b.username);
                                    const worldCupScoreB = allLost ? 0 : (isSingleWinnerB ? 3 : isSharedWinnerB ? 1 : 0);
                                    const pesceScoreB = isSheriff(b.username) ? 1 : 0;

                                    if (scoringMethod === "Golf") {
                                        return aScore - bScore;
                                    } else if (scoringMethod === "World Cup") {
                                        return worldCupScoreB - worldCupScoreA;
                                    } else if (scoringMethod === "Pesce") {
                                        if (aIsSheriff === 0 && bIsSheriff === 0) {
                                            return aScore - bScore;
                                        }
                                        return 0;
                                    } else {
                                        return bScore - aScore;
                                    }
                                }).map((data, index) => {
                                    const totalScore = getTotalScore(data.gamename);
                                    const progressValue = totalScore > 0
                                        ? data.gamename === "connections"
                                            ? (data.gamlescore / totalScore) * 100
                                            : ((totalScore - data.gamlescore) / (totalScore - 1)) * 100
                                        : 0;

                                    const isSingleWinner = winners.length === 1 && winners[0].username === data.username;
                                    const isSharedWinner = winners.length > 1 && winners.some(w => w.username === data.username);

                                    const allLost = minScore === 7;
                                    const worldCupScore = allLost ? 0 : (isSheriff(data.username) ? 3 : isSheriff(data.username) ? 1 : 0);
                                    const pesceScore = isSheriff(data.username) ? 1 : 0;

                                    return (
                                        <Row key={index} className="justify-content-between align-items-center py-2 px-3 mb-2 rounded bg-light shadow-sm">
                                            <Col xs={3} className="d-flex align-items-center gap-2">
                                                <div onClick={() => handleShowProfile(data)} style={{ cursor: 'pointer' }}>
                                                    <img
                                                        src={data.avatar ? `${baseURL}/user/uploads/${data.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                                                        alt="Profile"
                                                        className="rounded-circle mb-1"
                                                        style={{ width: '35px', height: '35px', objectFit: 'cover', border: '2px solid #0d6efd' }}
                                                    />
                                                </div>
                                            </Col>

                                            <Col xs={4} className="text-start fw-semibold text-primary" onClick={() => handleShowProfile(data)} style={{ cursor: 'pointer' }}>
                                                {data.username}

                                                {/* <p>Score is:{data.gamlescore}</p> */}
                                            </Col>

                                            <Col xs={5}>
                                                <Row className="align-items-center">
                                                    <Col md={7} xs={6} >
                                                        <ProgressBar
                                                            className={`${data.gamename}-progressbar`}
                                                            variant="success"
                                                            now={
                                                                scoringMethod === "Golf"
                                                                    ? data.gamlescore ?? totalScore
                                                                    : scoringMethod === "World Cup"
                                                                    ? worldCupScore
                                                                    : scoringMethod === "Pesce"
                                                                    ? pesceScore
                                                                    : (data.gamlescore ?? totalScore)
                                                            }
                                                            max={totalScore}
                                                            style={{ height: '8px' }}
                                                        />
                                                    </Col>

                                                    <Col md={5} xs={6} className="text-center d-flex fw-bold">
                                                        <span
                                                            onClick={() => showDayResult(data.createdat, data.useremail, data.gamename, period)}
                                                            className="text-primary"
                                                            style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                                                        >
                                                            {scoringMethod === "Golf"
                                                                ? (data.gamlescore ?? '') === '' ? totalScore : data.gamlescore
                                                                : scoringMethod === "World Cup"
                                                                ? worldCupScore
                                                                : pesceScore}
                                                            {data.gamename === 'phrazle' &&
                                                            scoringMethod === "Pesce" &&
                                                            isSheriff(data.username) &&
                                                            " 🤠"}
                                                            {scoringMethod !== "Pesce" && isSingleWinner && " 🏆"}
                                                        </span>
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                                    );
                                })}
                                </div>
                            );
                        })()}


                        {/* Wordle, Connections */}

                        {todayLeaderboard.length > 0 && (() => {
                            const filteredLeaderboard = todayLeaderboard.filter((data) => data.gamename !== "phrazle" && String(data?.is_paused) === "0");
                            if (filteredLeaderboard.length === 0) return null;

                            // Group scores by game
                            const gameScoresMap = {};
                            filteredLeaderboard.forEach(d => {
                                const score = Number(d.gamlescore ?? getTotalScore(d.gamename));
                                if (!gameScoresMap[d.gamename]) gameScoresMap[d.gamename] = [];
                                gameScoresMap[d.gamename].push({ ...d, score });
                            });

                            // Prepare best scores per game
                            const gameBestScores = {};
                            Object.entries(gameScoresMap).forEach(([gamename, scores]) => {
                                const best = Math.min(...scores.map(s => s.score));
                                gameBestScores[gamename] = best;
                            });

                            // Find top scorers
                            const topScorers = filteredLeaderboard.filter(d => {
                                const score = Number(d.gamlescore ?? getTotalScore(d.gamename));
                                return score === gameBestScores[d.gamename];
                            });

                            // Define sheriff checker before using it
                            const isSheriff = (username) => {
                            const found = filteredLeaderboard.find(
                                user =>
                                user.username?.trim().toLowerCase() === username?.trim().toLowerCase() &&
                                user.sheriff === true
                            );

                            // console.log("Sheriff check:", username, found);
                            return Boolean(found);
                            };

                        
                            return (
                                <div ref={dailyLeaderboardRef}>
                                <div className="d-flex align-items-center justify-content-center gap-3 cursor-pointer text-lg font-medium">
                                    <button onClick={(e) => { e.stopPropagation(); goToPreviousDay(); }} className="bg-dark text-white px-3 py-1 rounded">
                                    <FaArrowLeft />
                                    </button>
                                    <div>{dayjs(startDate).format("MMM D, YYYY")}</div>
                                    <button onClick={(e) => { e.stopPropagation(); goToNextDay(); }} className="bg-dark text-white px-3 py-1 rounded">
                                    <FaArrowRight />
                                    </button>
                                </div>
                                <h4 className="text-center py-3">Daily Leaderboard</h4>

                                {filteredLeaderboard
                                .slice()
                                .sort((a, b) => {
                                    const aIsSheriff = isSheriff(a.username) ? 1 : 0;
                                    const bIsSheriff = isSheriff(b.username) ? 1 : 0;
                                    if (aIsSheriff !== bIsSheriff) return bIsSheriff - aIsSheriff;

                                    const aScore = Number(a.gamlescore ?? getTotalScore(a.gamename));
                                    const bScore = Number(b.gamlescore ?? getTotalScore(b.gamename));
                                    return aScore - bScore;
                                })
                                .map((data, index) => {
                                    const totalScore = getTotalScore(data.gamename);
                                    
                                    const minScore = gameBestScores[data.gamename];
                                   
                                    const isSingleWinner =
                                        topScorers.length === 1 &&
                                        topScorers[0].username === data.username;


                                    const isSharedWinner =
                                        topScorers.length > 1 &&
                                        topScorers.some(w => w.username === data.username);

                                    // 🔹 Support Wordle (7), Quordle (35), Connections (4), Octordle (113)
                                    const allLost =
                                    (data.gamename === "connections" && minScore === 4) ||
                                    (data.gamename === "wordle" && minScore === 7) ||
                                    (data.gamename === "quordle" && minScore === 35) ||
                                    (data.gamename === "octordle" && minScore === 113);

                                    const worldCupScore = allLost ? 0 : (isSheriff(data.username) ? 3 : isSheriff(data.username) ? 1 : 0);
                                    // const pesceScore = allLost ? 0 : (isSingleWinner || isSharedWinner ? 1 : 0);
                                    const pesceScore = allLost ? 0 : (isSheriff(data.username) ? 1 : 0);
                                    
                                    return (
                                        <Row
                                        key={index}
                                        className="justify-content-between align-items-center py-2 px-3 mb-2 rounded bg-light shadow-sm"
                                        >
                                        <Col xs={3} className="d-flex align-items-center gap-2">
                                            <div onClick={() => handleShowProfile(data)} style={{ cursor: 'pointer' }}>
                                            <img
                                                src={
                                                data.avatar
                                                    ? `${baseURL}/user/uploads/${data.avatar}`
                                                    : `${baseURL}/user/uploads/default_avatar.png`
                                                }
                                                alt="Profile"
                                                className="rounded-circle mb-1"
                                                style={{ width: '35px', height: '35px', objectFit: 'cover', border: '2px solid #0d6efd' }}
                                            />
                                            </div>
                                        </Col>

                                        <Col xs={4} className="text-start fw-semibold text-primary" onClick={() => handleShowProfile(data)} style={{ cursor: 'pointer' }}>
                                            {data.username}
                                            {/* <p>Score is:{data.gamlescore}</p> */}

                                        </Col>

                                        <Col xs={5}>
                                            <Row className="align-items-center">
                                            <Col md={7} xs={6}>
                                                <ProgressBar
                                                className={`${data.gamename}-progressbar`}
                                                variant="success"
                                                now={
                                                    scoringMethod === "Golf"
                                                    ? data.gamlescore ?? totalScore
                                                    : scoringMethod === "World Cup"
                                                        ? worldCupScore
                                                        : scoringMethod === "Pesce"
                                                        ? pesceScore
                                                        : (data.gamlescore ?? totalScore)
                                                }
                                                max={totalScore}
                                                style={{ height: '8px' }}
                                                />
                                            </Col>

                                            <Col md={5} xs={6} className="text-center d-flex fw-bold">
                                                <span
                                                    onClick={() => showDayResult(data.createdat, data.useremail, data.gamename)}
                                                    className="text-primary"
                                                    style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                                                >
                                                    {scoringMethod === "Golf"
                                                    ? (data.gamlescore ?? '') === '' ? totalScore : data.gamlescore
                                                    : scoringMethod === "World Cup"
                                                    ? worldCupScore
                                                    : pesceScore}
                                                    {/* Sheriff emoji for Wordle */}
                                                    {data.gamename === 'wordle' &&
                                                    scoringMethod === "Pesce" &&
                                                    isSheriff(data.username) &&
                                                    data.gamlescore !== null &&
                                                    data.gamlescore !== '' &&
                                                    Number(data.gamlescore) !== 7 &&
                                                    " 🤠"}

                                                    {/* Sheriff emoji for Connections */}
                                                    {data.gamename === 'connections' &&
                                                    scoringMethod === "Pesce" &&
                                                    isSheriff(data.username) &&
                                                    data.gamlescore !== null &&
                                                    data.gamlescore !== '' &&
                                                    Number(data.gamlescore) !== 4 &&
                                                    " 🤠"}

                                                    {/* Sheriff emoji for Quordle */}
                                                    {data.gamename === 'quordle' &&
                                                    scoringMethod === "Pesce" &&
                                                    isSheriff(data.username) &&
                                                    data.gamlescore !== null &&
                                                    data.gamlescore !== '' &&
                                                    Number(data.gamlescore) !== 35 &&
                                                    " 🤠"}

                                                    {/* Sheriff emoji for Octordle */}
                                                    {data.gamename === 'octordle' &&
                                                    scoringMethod === "Pesce" &&
                                                    isSheriff(data.username) &&
                                                    data.gamlescore !== null &&
                                                    data.gamlescore !== '' &&
                                                    Number(data.gamlescore) !== 113 &&
                                                    " 🤠"}

                                                    {/* Trophy for top scorer */}
                                                    {scoringMethod !== "Pesce" && isSingleWinner && " 🏆"}
                                                </span>
                                                </Col>

                                            </Row>
                                        </Col>
                                        </Row>
                                    );
                                    })}
                                </div>
                            );
                            })()}


                        </>
                    ) : null}
                </Col>
            </Row>

            {startDate && (
            <Row className="justify-content-center">
                <Col md={4}>
                <GetGroupMessagesModal 
                    groupId={id}
                    gameName={game}
                    periodDate={dayjs(startDate).format("YYYY-MM-DD HH:mm:ss")}
                    periodType={game == 'phrazle' ? period : ''}
                    userId={userId}
                    archive = 'true'
                />
                </Col>
            </Row>
            )}

            {/* Weekly Leaderboard */}
            <Row className="justify-content-center leaderboard mt-5 pt-4">
                <Col md={5}>
                    <div className="d-flex align-items-center justify-content-center gap-3 text-lg font-medium">
                        <button
                            onClick={goToPreviousWeek}
                            disabled={!weeklyData?.canGoBack}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            {weeklyData?.weekOf ? `Week of ${dayjs(weeklyData.weekOf).format("MMM D, YYYY")}` : "Week of —"}
                        </div>
                        <button
                            onClick={goToNextWeek}
                            disabled={!weeklyData?.canGoForward}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                    <h4 className="py-3 text-center">Weekly Leaderboard</h4>

                    {!weeklyData ? null : !weeklyData.available ? (
                        <p className="text-center text-muted">Not Yet Available</p>
                    ) : (
                        (() => {
                            const rows = (weeklyData.data || []).filter(d => String(d?.is_paused) === "0");
                            if (rows.length === 0) {
                                return <p className="text-center text-muted">Not Yet Available</p>;
                            }
                            const sorted = rows.slice().sort((a, b) => {
                                if (scoringMethod === "World Cup") {
                                    return (b.total_worldcup_points ?? 0) - (a.total_worldcup_points ?? 0);
                                } else if (scoringMethod === "Pesce") {
                                    return (b.sheriffCount ?? 0) - (a.sheriffCount ?? 0);
                                }
                                return (a.gamlescore ?? 0) - (b.gamlescore ?? 0); // Golf: lower is better
                            });
                            const totalScore = getTotalScore(game);

                            // Winner highlight (trophy for Golf/World Cup, sheriff
                            // hat for Pesce) - only when there's a single winner,
                            // same convention the Daily Leaderboard uses.
                            let winnerEmails = [];
                            if (scoringMethod === "World Cup") {
                                const maxWc = Math.max(...rows.map(d => d.total_worldcup_points ?? 0));
                                winnerEmails = rows.filter(d => (d.total_worldcup_points ?? 0) === maxWc).map(d => d.useremail);
                            } else if (scoringMethod === "Pesce") {
                                const maxSheriff = Math.max(...rows.map(d => d.sheriffCount ?? 0));
                                if (maxSheriff > 0) {
                                    winnerEmails = rows.filter(d => (d.sheriffCount ?? 0) === maxSheriff).map(d => d.useremail);
                                }
                            } else {
                                const minScore = Math.min(...rows.map(d => d.gamlescore ?? 0));
                                winnerEmails = rows.filter(d => (d.gamlescore ?? 0) === minScore).map(d => d.useremail);
                            }
                            const isSingleWinner = winnerEmails.length === 1;

                            return sorted.map((data, index) => {
                                let nowValue = data.gamlescore ?? 0;
                                let maxValue = (data.totalGamesPlayed || 1) * totalScore;
                                if (scoringMethod === "World Cup") {
                                    nowValue = data.total_worldcup_points ?? 0;
                                    maxValue = (data.totalGamesPlayed || 1) * 3;
                                } else if (scoringMethod === "Pesce") {
                                    nowValue = data.sheriffCount ?? 0;
                                    maxValue = data.totalGamesPlayed || 1;
                                }
                                const isWinner = isSingleWinner && winnerEmails[0] === data.useremail;
                                return (
                                    <Row key={index} className="justify-content-between align-items-center py-2 px-3 mb-2 rounded bg-light shadow-sm">
                                        <Col xs={3} className="d-flex align-items-center gap-2">
                                            <img
                                                src={data.avatar ? `${baseURL}/user/uploads/${data.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                                                alt="Profile"
                                                className="rounded-circle"
                                                style={{ width: '35px', height: '35px', objectFit: 'cover', cursor: 'pointer', border: '2px solid #0d6efd' }}
                                                onClick={() => handleShowProfile(data)}
                                            />
                                        </Col>
                                        <Col xs={4} className="text-start fw-semibold text-primary" style={{ cursor: 'pointer' }} onClick={() => handleShowProfile(data)}>
                                            {data.username}
                                        </Col>
                                        <Col xs={5}>
                                            <Row className="align-items-center">
                                                <Col md={7} xs={6}>
                                                    <ProgressBar
                                                        className={`${game}-progressbar`}
                                                        variant="success"
                                                        now={maxValue > 0 ? (nowValue / maxValue) * 100 : 0}
                                                    />
                                                </Col>
                                                <Col md={5} xs={6} className="fw-bold">
                                                    {nowValue}
                                                    {isWinner && (scoringMethod === "Pesce" ? " 🤠" : " 🏆")}
                                                </Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                );
                            });
                        })()
                    )}
                </Col>
            </Row>

            {/* Monthly Leaderboard */}
            <Row className="justify-content-center leaderboard mt-5 pt-4">
                <Col md={5}>
                    <div className="d-flex align-items-center justify-content-center gap-3 text-lg font-medium">
                        <button
                            onClick={goToPreviousMonth}
                            disabled={!monthlyData?.canGoBack}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            {monthlyData?.monthOf ? dayjs(monthlyData.monthOf).format("MMMM YYYY") : "—"}
                        </div>
                        <button
                            onClick={goToNextMonth}
                            disabled={!monthlyData?.canGoForward}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                    <h4 className="py-3 text-center">Monthly Leaderboard</h4>

                    {!monthlyData ? null : !monthlyData.available ? (
                        <p className="text-center text-muted">Not Yet Available</p>
                    ) : (
                        (() => {
                            const rows = (monthlyData.data || []).filter(d => String(d?.is_paused) === "0");
                            if (rows.length === 0) {
                                return <p className="text-center text-muted">Not Yet Available</p>;
                            }
                            const sorted = rows.slice().sort((a, b) => {
                                if (scoringMethod === "World Cup") {
                                    return (b.total_worldcup_points ?? 0) - (a.total_worldcup_points ?? 0);
                                } else if (scoringMethod === "Pesce") {
                                    return (b.sheriffCount ?? 0) - (a.sheriffCount ?? 0);
                                }
                                return (a.gamlescore ?? 0) - (b.gamlescore ?? 0); // Golf: lower is better
                            });
                            const totalScore = getTotalScore(game);

                            let winnerEmails = [];
                            if (scoringMethod === "World Cup") {
                                const maxWc = Math.max(...rows.map(d => d.total_worldcup_points ?? 0));
                                winnerEmails = rows.filter(d => (d.total_worldcup_points ?? 0) === maxWc).map(d => d.useremail);
                            } else if (scoringMethod === "Pesce") {
                                const maxSheriff = Math.max(...rows.map(d => d.sheriffCount ?? 0));
                                if (maxSheriff > 0) {
                                    winnerEmails = rows.filter(d => (d.sheriffCount ?? 0) === maxSheriff).map(d => d.useremail);
                                }
                            } else {
                                const minScore = Math.min(...rows.map(d => d.gamlescore ?? 0));
                                winnerEmails = rows.filter(d => (d.gamlescore ?? 0) === minScore).map(d => d.useremail);
                            }
                            const isSingleWinner = winnerEmails.length === 1;

                            return sorted.map((data, index) => {
                                let nowValue = data.gamlescore ?? 0;
                                let maxValue = (data.totalGamesPlayed || 1) * totalScore;
                                if (scoringMethod === "World Cup") {
                                    nowValue = data.total_worldcup_points ?? 0;
                                    maxValue = (data.totalGamesPlayed || 1) * 3;
                                } else if (scoringMethod === "Pesce") {
                                    nowValue = data.sheriffCount ?? 0;
                                    maxValue = data.totalGamesPlayed || 1;
                                }
                                const isWinner = isSingleWinner && winnerEmails[0] === data.useremail;
                                return (
                                    <Row key={index} className="justify-content-between align-items-center py-2 px-3 mb-2 rounded bg-light shadow-sm">
                                        <Col xs={3} className="d-flex align-items-center gap-2">
                                            <img
                                                src={data.avatar ? `${baseURL}/user/uploads/${data.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                                                alt="Profile"
                                                className="rounded-circle"
                                                style={{ width: '35px', height: '35px', objectFit: 'cover', cursor: 'pointer', border: '2px solid #0d6efd' }}
                                                onClick={() => handleShowProfile(data)}
                                            />
                                        </Col>
                                        <Col xs={4} className="text-start fw-semibold text-primary" style={{ cursor: 'pointer' }} onClick={() => handleShowProfile(data)}>
                                            {data.username}
                                        </Col>
                                        <Col xs={5}>
                                            <Row className="align-items-center">
                                                <Col md={7} xs={6}>
                                                    <ProgressBar
                                                        className={`${game}-progressbar`}
                                                        variant="success"
                                                        now={maxValue > 0 ? (nowValue / maxValue) * 100 : 0}
                                                    />
                                                </Col>
                                                <Col md={5} xs={6} className="fw-bold">
                                                    {nowValue}
                                                    {isWinner && (scoringMethod === "Pesce" ? " 🤠" : " 🏆")}
                                                </Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                );
                            });
                        })()
                    )}
                </Col>
            </Row>

            {/* Yearly Leaderboard */}
            <Row className="justify-content-center leaderboard mt-5 pt-4">
                <Col md={5}>
                    <div className="d-flex align-items-center justify-content-center gap-3 text-lg font-medium">
                        <button
                            onClick={goToPreviousYear}
                            disabled={!yearlyData?.canGoBack}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>{yearlyData?.year ?? "—"}</div>
                        <button
                            onClick={goToNextYear}
                            disabled={!yearlyData?.canGoForward}
                            className="bg-dark text-white px-3 py-1 rounded"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                    <h4 className="py-3 text-center">
                        {yearlyData?.label ? `${yearlyData.label} Leaderboard` : "Yearly Leaderboard"}
                    </h4>

                    {!yearlyData ? null : (() => {
                        const rows = (yearlyData.data || []).filter(d => String(d?.is_paused) === "0");
                        if (rows.length === 0) {
                            return <p className="text-center text-muted">Not Yet Available</p>;
                        }
                        const sorted = rows.slice().sort((a, b) => {
                            if (scoringMethod === "World Cup") {
                                return (b.total_worldcup_points ?? 0) - (a.total_worldcup_points ?? 0);
                            } else if (scoringMethod === "Pesce") {
                                return (b.sheriffCount ?? 0) - (a.sheriffCount ?? 0);
                            }
                            return (a.gamlescore ?? 0) - (b.gamlescore ?? 0); // Golf: lower is better
                        });
                        const totalScore = getTotalScore(game);

                        let winnerEmails = [];
                        if (scoringMethod === "World Cup") {
                            const maxWc = Math.max(...rows.map(d => d.total_worldcup_points ?? 0));
                            winnerEmails = rows.filter(d => (d.total_worldcup_points ?? 0) === maxWc).map(d => d.useremail);
                        } else if (scoringMethod === "Pesce") {
                            const maxSheriff = Math.max(...rows.map(d => d.sheriffCount ?? 0));
                            if (maxSheriff > 0) {
                                winnerEmails = rows.filter(d => (d.sheriffCount ?? 0) === maxSheriff).map(d => d.useremail);
                            }
                        } else {
                            const minScore = Math.min(...rows.map(d => d.gamlescore ?? 0));
                            winnerEmails = rows.filter(d => (d.gamlescore ?? 0) === minScore).map(d => d.useremail);
                        }
                        const isSingleWinner = winnerEmails.length === 1;

                        return sorted.map((data, index) => {
                            let nowValue = data.gamlescore ?? 0;
                            let maxValue = (data.totalGamesPlayed || 1) * totalScore;
                            if (scoringMethod === "World Cup") {
                                nowValue = data.total_worldcup_points ?? 0;
                                maxValue = (data.totalGamesPlayed || 1) * 3;
                            } else if (scoringMethod === "Pesce") {
                                nowValue = data.sheriffCount ?? 0;
                                maxValue = data.totalGamesPlayed || 1;
                            }
                            const isWinner = isSingleWinner && winnerEmails[0] === data.useremail;
                            return (
                                <Row key={index} className="justify-content-between align-items-center py-2 px-3 mb-2 rounded bg-light shadow-sm">
                                    <Col xs={3} className="d-flex align-items-center gap-2">
                                        <img
                                            src={data.avatar ? `${baseURL}/user/uploads/${data.avatar}` : `${baseURL}/user/uploads/default_avatar.png`}
                                            alt="Profile"
                                            className="rounded-circle"
                                            style={{ width: '35px', height: '35px', objectFit: 'cover', cursor: 'pointer', border: '2px solid #0d6efd' }}
                                            onClick={() => handleShowProfile(data)}
                                        />
                                    </Col>
                                    <Col xs={4} className="text-start fw-semibold text-primary" style={{ cursor: 'pointer' }} onClick={() => handleShowProfile(data)}>
                                        {data.username}
                                    </Col>
                                    <Col xs={5}>
                                        <Row className="align-items-center">
                                            <Col md={7} xs={6}>
                                                <ProgressBar
                                                    className={`${game}-progressbar`}
                                                    variant="success"
                                                    now={maxValue > 0 ? (nowValue / maxValue) * 100 : 0}
                                                />
                                            </Col>
                                            <Col md={5} xs={6} className="fw-bold">
                                                {nowValue}
                                                {isWinner && (scoringMethod === "Pesce" ? " 🤠" : " 🏆")}
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            );
                        });
                    })()}
                </Col>
            </Row>

            {latestJoinDate && (
                <p className="text-center text-muted mb-4 mt-5 pt-4">
                    Start Date: {dayjs(latestJoinDate).format("MMMM D, YYYY")}
                </p>
            )}

            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Day Result</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {dayResults && dayResults.length > 0 ? (
                    dayResults.map((item, index) => {
                        const date = new Date(item.createdat);
                        const todayDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        });

                        // Example: You must have something to identify game type
                        // Could be item.gametype or you pass a prop 'gameType'
                        // For now, assume `item.gameType` holds 'phrazle', 'wordle', or 'connection'
                        const gameType = item.gameType || 'phrazle'; // default phrazle

                        if (game === 'phrazle') {
                        // For phrazle, remove colored squares and tags
                            const rawScore = item.phrazlescore || "";
                            const cleanedScore = rawScore.replace(/[🟨,🟩,🟦,🟪,⬜]/g, "");
                            const phrazle_score_text = cleanedScore.replace(/#phrazle|https:\/\/solitaired.com\/phrazle/g, '');
                            const lettersAndNumbersRemoved = rawScore.replace(/[a-zA-Z0-9,#:./\\]/g, "");
                            const phrazleScore = splitIntoRowsByNewline(lettersAndNumbersRemoved);
                            const gamleScore = item.gamlescore;

                        return (
                             <div className="text-center pb-2" key={index}>
                               
                                <h5 className='text-center'>Gamle Score: {gamleScore}</h5>
                                
                                <div className="phrazle-score-board-text my-3 fs-5 text-center">{phrazle_score_text}</div>
                                <div className='today text-center fs-6 my-2 fw-bold'>{todayDate} - {period}</div>
                                <div className="phrazle-score m-auto text-center">
                                    {phrazleScore.map((row, rowIndex) => (
                                        row.trim() && (
                                            <div className="phrasle-row-score" key={rowIndex}>
                                                {row.split(' ').map((part, partIndex) => (
                                                    <div className="row" key={partIndex}>
                                                        {part.split(' ').map((symbol, symbolIndex) => (
                                                            <div className="items" key={symbolIndex}>{symbol}</div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        );
                        } 
                        else if (game === 'wordle') {
                        // Example Wordle display - customize as needed
                        const rawScore = item.wordlescore || "";
                        const cleanedScore = rawScore.replace(/[🟩🟨⬜⬛]/g, "");
                        const scoreParts = cleanedScore.split(" ");
                        const lettersAndNumbersRemoved = rawScore.replace(/[a-zA-Z0-9,/\\]/g, "");
                        const removespace = lettersAndNumbersRemoved.replace(/\s+/g, '');
                        const wordleScores = splitIntoRowsByLength(removespace, 5);
                        const createDate = item.createdat;
                        const gamleScore = item.gamlescore;
                        return (
                            <div key={index}>
                                <h5 className='text-center'>Gamle Score: {gamleScore}</h5>
                                <div className={`wordle-score-board-text my-3 fs-5 text-center`}>{cleanedScore}</div>
                                <div className='today text-center fs-6 my-2 fw-bold'>{todayDate}</div>
                                <pre className='text-center'>
                                {wordleScores.map((row, rowIndex) => (
                                    <div key={rowIndex}>{row}</div>
                                ))}
                                </pre>
                            </div>
                        );
                        } 
                        else if (game === 'connections') {
                        // Example Connection game display
                        const rawScore = item.connectionsscore || "";
                        const cleanedScore = rawScore.replace(/[🟨,🟩,🟦,🟪]/g, "");
                        const lettersAndNumbersRemoved = rawScore.replace(/[a-zA-Z0-9,#:/\\]/g, "");
                        const removespace = lettersAndNumbersRemoved.replace(/\s+/g, '');
                        const connectionsScore = splitIntoRowsByLength(removespace, 4);
                        const createDate = item.createdat; // Ensure this matches your database field name
                        const gamleScore = item.gamlescore;

                        return (
                            <div key={index}>
                                <h5 className='text-center'>Gamle Score: {gamleScore}</h5>
                                <>
                                <div className={`wordle-score-board-text my-3 fs-5 text-center`}>{cleanedScore}</div>
                                <div className='today text-center fs-6 my-2 fw-bold'>{todayDate}</div>
                                <pre className='text-center'>
                                    {connectionsScore.map((row, rowIndex) => (
                                        <div key={rowIndex}>{row}</div>
                                    ))}
                                </pre>
                                </>                 
                            </div>
                        );
                        }
                        else if (game === 'quordle') {
                        // Quordle's result is attempt-count badges (digits/keycap
                        // emoji, plus a red square for a failed word), not a
                        // color-tile grid like Wordle/Connections - matches the
                        // extraction already used in QuordleStat.jsx/QuordleScoreByDate.jsx.
                        const cleanedScore = item.quordlescore
                                .replace(/[🟥🟨🟩⬛⬜🙂]/gu, "") // remove emojis
                                .replace(/m-w\.com\/games\/quordle\//g, "") // remove link
                                .split("\n")
                                .map(line => line.trim())
                                .find(line => line.startsWith("Daily Quordle")) || "";

                            const quordleScore = item.quordlescore
                            .split("\n")                        // split into lines
                            .map(l => l.trim())                 // trim spaces
                            .filter(l => /^[0-9️⃣🟥]+$/u.test(l)) // attempt-count badges (incl. red "failed" squares)
                            .join("\n");
                            const createDate = item.createdat; // Ensure this matches your database field name
                            const date = new Date(createDate);
                            const todayDate = date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            });
                            const gamleScore = item.gamlescore;
                            return (
                                
                                <div key={index}>
                                    <h5 className='text-center'>Gamle Score: {gamleScore}</h5>
                                    <>
                                    <div className={`wordle-score-board-text my-3 fs-5 text-center`}>{cleanedScore}</div>
                                    <div className='today text-center fs-6 my-2 fw-bold'>{todayDate}</div>
                                    <pre className='text-center'>
                                        {quordleScore}
                                    </pre>
                                    </>
                                </div>
                            );
                        }
                        else if (game === 'octordle') {
                        const rawScore = item.octordlescore || "";
                        const cleanedScore = rawScore
                            .split("\n")
                            .map(l => l.trim())
                            .find(l => l.startsWith("Daily Octordle")) || "";

                        const octordleScore = rawScore
                            .split("\n")
                            .map(l => l.trim())
                            .filter(l => l && !l.startsWith("Daily Octordle") && !l.startsWith("Score:") && !/[a-zA-Z]/.test(l))
                            .join("\n");
                        const gamleScore = item.gamlescore;
                        return (
                            <div key={index}>
                                <h5 className='text-center'>Gamle Score: {gamleScore}</h5>
                                <div className={`wordle-score-board-text my-3 fs-5 text-center`}>{cleanedScore}</div>
                                <div className='today text-center fs-6 my-2 fw-bold'>{todayDate}</div>
                                <pre className='text-center'>
                                    {octordleScore}
                                </pre>
                            </div>
                        );
                        }
                        else {
                        return (
                            <div key={index} className="text-center pb-2">
                            <h5>Unknown Game Type</h5>
                            </div>
                        );
                        }
                    })
                    ) : (
                        <div className="text-center">
                            <h5>{noDataMessage}</h5>
                            <h6 className="text-muted">No Play</h6>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                    Close
                    </Button>
                </Modal.Footer>
                </Modal>

        </>
        
    );
}

export default GroupScoreByDate;