'use client';
import React from 'react';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import Header from './header';
import Wallet from '../wallet';

export default function RandomNumber() {

    // Read function that doesn't need args
    const { data: readData, refetch: refetchReadData } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'randomNumber',
    }) as { data: bigint | undefined, refetch: () => void };

    // Write function setup
    const { writeContract, data: hash, isPending } = useWriteContract();

    // Transaction receipt
    const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const { isConnected } = useAccount();
    const [scrambledText, setScrambledText] = useState('');
    const [initialAnimation, setInitialAnimation] = useState(true);
    const [windowWidth, setWindowWidth] = useState<number>(0);

    // Characters for scrambling effect
    const chars = 'g7#A1vX2$tbM39@PwLzqY!eK5RfU6&8cjdNVoZ0xB*hpJr4mETQS^aHiGWDClukO%';

    // Function to calculate number of rows based on screen width and number length
    const calculateRows = (number: string) => {
        const length = number.length;
        let rows = 4; // Default number of rows

        if (windowWidth < 640) { // Mobile
            rows = Math.ceil(length / 8);
        } else if (windowWidth < 1024) { // Tablet
            rows = Math.ceil(length / 12);
        } else { // Desktop
            rows = Math.ceil(length / 16);
        }

        return Math.max(2, Math.min(6, rows)); // Ensure between 2 and 6 rows
    };

    // Function to split number into dynamic rows
    const splitNumberIntoRows = (number: string) => {
        const rows = calculateRows(number);
        const chunkSize = Math.ceil(number.length / rows);
        const chunks = [];
        for (let i = 0; i < number.length; i += chunkSize) {
            chunks.push(number.slice(i, i + chunkSize));
        }
        return chunks;
    };

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        // Set initial width
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        let animationSteps = 0;
        const maxSteps = 10;

        if (readData) {
            const number = BigInt(readData);
            const numberStr = number.toString();
            setScrambledText(numberStr);
        }

        if (initialAnimation) {
            // Create initial scrambled text of the same length as the final number
            const targetLength = readData ? BigInt(readData).toString().length : 12;
            let currentText = '';
            for (let i = 0; i < targetLength; i++) {
                currentText += getRandomChar();
            }
            setScrambledText(currentText);

            intervalId = setInterval(() => {
                animationSteps++;

                let newText = '';
                for (let i = 0; i < targetLength; i++) {
                    if (i < (targetLength * animationSteps) / maxSteps) {
                        newText += getRandomChar();
                    } else {
                        newText += getRandomChar();
                    }
                }

                setScrambledText(newText);

                if (animationSteps >= maxSteps) {
                    clearInterval(intervalId);
                    if (readData) {
                        setScrambledText(BigInt(readData).toString());
                    } else {
                        setScrambledText(currentText);
                    }
                    setInitialAnimation(false);
                }
            }, 100);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isTransactionSuccess, refetchReadData, initialAnimation, readData]);

    useEffect(() => {
        if (isTransactionSuccess) {
            setInitialAnimation(true);
            const timer = setTimeout(async () => {
                await refetchReadData();
                if (readData) {
                    setScrambledText(BigInt(readData).toString());
                }
                setInitialAnimation(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isTransactionSuccess, refetchReadData, readData]);

    // Write function handler with custom gas limit
    const generateRandomNumber = async () => {
        console.log("GENERATING RANDOM NUMBER")
        console.log("BEFORE", readData)
        try {
            writeContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'generateRandomNumber',
                // gas: BigInt(330063038),
            });
            if (isTransactionSuccess) {
                refetchReadData();
                console.log("AFTER", readData)
            }
        } catch (error) {
            console.error('Transfer failed:', error);
        }
    };

    // Get random character from chars string
    const getRandomChar = () => {
        return chars.charAt(Math.floor(Math.random() * chars.length));
    };

    const numberRows = splitNumberIntoRows(scrambledText);

    return (
        <>
            {isConnected ? <>
                <Header />
                <div className="min-h-screen bg-yellow-pattern flex flex-col relative">
                    <main className="flex-grow mt-8">
                        <div className="container mx-auto px-4 py-12">
                            <div className="flex flex-col lg:flex-row items-center lg:gap-64">
                                {/* Left Side - Text Content */}
                                <div className="w-full lg:w-1/2 space-y-8 text-wrap mt-24">
                                    <h1 className="font-funnel-display text-3xl md:text-4xl font-bold text-black">
                                        Here&apos;s Your Verifiable Random Number ...
                                    </h1>
                                    <div className="space-y-4 font-funnel-display">
                                        {numberRows.map((row, index) => (
                                            <h1 key={index} className="font-funnel-display text-3xl md:text-4xl font-bold text-red-500 tracking-wider">
                                                {row}
                                            </h1>
                                        ))}
                                    </div>
                                    {/* <p className="font-funnel-display text-lg text-gray-600 font-funnel">
                                        Generate publicly verifiable random numbers with ease using our high performance,
                                        blockchain aligned infrastructure. Unlike traditional solutions, our permissioned consortium
                                        of node operators delivers secure, tamperproof randomness, optimized for
                                        decentralized applications and on-chain integrations.
                                    </p> */}

                                    <div>
                                        <button
                                            onClick={generateRandomNumber}
                                            disabled={isPending || isTransactionLoading}
                                            className="font-funnel-display flex flex-row gap-2 text-red-500 text-2xl font-medium py-3 transition duration-300 transform hover:scale-105">
                                            <Image
                                                src="/assets/images/redarrow.svg"
                                                alt="Description"
                                                width={30}
                                                height={30}
                                                className=""
                                            />
                                            Generate Random Number
                                        </button>
                                    </div>
                                </div>

                                {/* Right Side - Graphic Area */}
                                <div className="w-full lg:w-1/2 justify-center items-center hidden lg:block">
                                    <div className="w-full aspect-square max-w-md flex items-center justify-center">
                                        <Image
                                            src="/assets/images/reddiamond.svg"
                                            alt="Description"
                                            width={300}
                                            height={300}
                                            className=""
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </> : <>
                <Wallet />
            </>}
        </>
    );
}