import React, { useState, forwardRef, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button, Alert } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment-timezone';
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import dayjs from "dayjs";
import { consumeGracePeriodJump } from '../../../utils/gracePeriod';

function QuordleScoreByDate() {
    const baseURL = import.meta.env.VITE_BASE_URL;
    const USER_AUTH_DATA = JSON.parse(localStorage.getItem('auth'));
    const loginuserEmail = USER_AUTH_DATA.email;
    const [selectedDate, setSelectedDate] = useState(null);
    const [statsChart, setStatsChart] = useState([]);
    const [dataFetched, setDataFetched] = useState(false);
    const [dataFetchedError, setFetchedError] = useState(false);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)));
    // The date of this user's first-ever Quordle result - stays blank until
    // they've played, and bounds how far back "Go To Date" can go so it
    // never shows "No Play" for a date before they started.
    const [firstPlayedDate, setFirstPlayedDate] = useState(null);
    const containerRef = useRef(null);

    // Function to format the selected date in YYYY-MM-DD format for backend
    const formatDateForBackend = (date) => moment(date).format('YYYY-MM-DD');

    // Handle date selection
    const handleDateChange = (date) => {
        setStartDate(date);
        const formattedDate = formatDateForBackend(date);
        fetchDataByDate(formattedDate);  // Trigger data fetching after date selection
    };

    useEffect(() => {
        // A grace-period submission just made from the Paste Result modal
        // gets filed under the *previous* day, so "Today's Result" has
        // nothing new to show - jump straight to that date instead of the
        // default (yesterday) and scroll down so the Gamler actually sees
        // the result they just pasted.
        const graceDate = consumeGracePeriodJump('quordle');
        const initialDate = graceDate ? moment(graceDate, 'YYYY-MM-DD').toDate() : startDate;
        if (graceDate) {
            setStartDate(initialDate);
        }
        const formattedDate = formatDateForBackend(initialDate);
        fetchDataByDate(formattedDate);

        if (graceDate && containerRef.current) {
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }

        axios.get(`${baseURL}/games/quordle/get-statistics.php`, { params: { useremail: loginuserEmail } })
            .then((response) => {
                const firstDate = response.data?.statistics?.firstPlayedDate;
                if (firstDate) {
                    setFirstPlayedDate(moment(firstDate, 'YYYY-MM-DD').toDate());
                }
            })
            .catch(() => {
                // No stats yet (e.g. brand new account) - firstPlayedDate
                // just stays null, matching "not played yet".
            });
    }, []);

    const fetchDataByDate = (date) => {
        const timeZone = moment.tz.guess(); // Automatically get the user's local time zone
    
        // Make the API request to the endpoint with date and timeZone as query parameters
        axios.get(`${baseURL}/games/quordle/get-score.php`, {
            params: {
                useremail: loginuserEmail,
                today: date,
                timeZone: timeZone
            }
        })
        .then((response) => {
            if (response.data.status === "success") {
                setStatsChart(response.data.quordlescore);
                setDataFetched(true);
                setFetchedError(false);
            } else {
                setStatsChart([]);
                setDataFetched(true);
                setFetchedError(true);
            }
        })
        .catch((error) => {
            setStatsChart([]);
            setDataFetched(true);
            setFetchedError(true);
        });
    };

    // Function to slice the string into rows of a specified length
    const splitIntoRows = (inputString, rowLength) => {
        const rows = [];
        const charArray = Array.from(inputString);
        for (let i = 0; i < charArray.length; i += rowLength) {
            rows.push(charArray.slice(i, i + rowLength).join(''));
        }
        return rows;
    };

    // Format createdAt to display as DD-MM-YYYY
    const formatCreatedAt = (createdat) => moment(createdat).format('MMM D, YYYY');

    // const ExampleCustomInput = forwardRef(({ value, onClick }, ref) => (
    //     <Button className="example-custom-input Quordle-btn px-5 btn btn-primary" onClick={onClick} ref={ref}>
    //         Go To Date
    //     </Button>
    // ));

    const goToPreviousDay = () => {
        if (firstPlayedDate && !dayjs(startDate).isAfter(dayjs(firstPlayedDate), 'day')) return; // already at the first-played date
        const prevDate = dayjs(startDate).subtract(1, 'day').toDate();
        handleDateChange(prevDate);
    };
    
    const goToNextDay = () => {
        const nextDate = dayjs(startDate).add(1, 'day');
        const today = dayjs().startOf('day');
        if (!nextDate.isBefore(today)) return; // stop if nextDate is today or after
        handleDateChange(nextDate.toDate());
    };

    const ExampleCustomInput = forwardRef(({ value, onClick }, ref) => {
            const parsedDate = dayjs(value, "DD-MM-YYYY");

        return (
            <>
                <Button className={`example-custom-input px-5 Quordle-btn`} onClick={onClick} ref={ref}>
            Go To Date
        </Button>
            
        
            </>
        );
    });

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
                    maxDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                    minDate={firstPlayedDate}
                />
            </div>
            <ul className='score-by-date p-2' ref={containerRef}>
                {dataFetched && (
                <>
                    <div className="d-flex align-items-center justify-content-center gap-3 cursor-pointer text-lg font-medium py-4">
                        <button onClick={(e) => { e.stopPropagation(); goToPreviousDay(); }} className="bg-dark text-white px-3 py-1 rounded">
                            <FaArrowLeft />
                        </button>
                        <div>
                            {dayjs(startDate).format("MMM D, YYYY")}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); goToNextDay(); }} className="bg-dark text-white px-3 py-1 rounded">
                            <FaArrowRight />
                        </button>
                    </div>

                    {statsChart.length > 0 ? (
                        statsChart.map((item, index) => {
                            console.log(item);
                            const cleanedScore = item.quordlescore
                                .replace(/[🟥🟨🟩⬛⬜🙂]/g, "") // remove emojis
                                .replace(/m-w\.com\/games\/quordle\//g, "") // remove link
                                .split("\n") // split lines
                                .map(line => line.trim()) // remove spaces
                                .find(line => line.startsWith("Daily Quordle")) || "";

                           const quordleScore = item.quordlescore
                            .split("\n")
                            .map(l => l.trim())
                            .filter(l =>
                                /^[0-9️⃣🟥]+$/u.test(l) || /^[🟥🟩🟨⬛⬜]+$/.test(l)
                            )
                            .join("\n");
                            //const quordleScore = splitIntoRows(lettersAndNumbersRemoved);
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
                        })
                    ) : (
                        <div>
                            <h6 className='text-center'>Gamle Score: 35</h6>
                            <p className='text-muted text-center'>No Play</p>
                        </div>
                    )}

                    {firstPlayedDate && (
                        <p className="text-center mt-5">
                            Start Date: {moment(firstPlayedDate).format('MMMM D, YYYY')}
                        </p>
                    )}
                </>
            )}

            </ul>
        </>
    );
}
export default QuordleScoreByDate;
