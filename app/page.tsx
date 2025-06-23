"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Search,
  Loader2,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface UsernameResult {
  username: string;
  isAvailable: boolean;
  popularity: "rare" | "uncommon" | "common";
}

export default function InstagramUsernameFinder() {
  const [usernameLength, setUsernameLength] = useState([6]);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [maxNumbers, setMaxNumbers] = useState([2]);
  const [numUsernamesToCheck, setNumUsernamesToCheck] = useState([1000]); // New state for user-defined check count
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<UsernameResult[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [totalChecked, setTotalChecked] = useState(0);
  const { toast } = useToast();

  // New states for manual check
  const [manualUsername, setManualUsername] = useState("");
  const [manualCheckResult, setManualCheckResult] =
    useState<UsernameResult | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);

  const resultsPerPage = 20;
  const availableResults = results.filter((r) => r.isAvailable);
  const totalPages = Math.ceil(availableResults.length / resultsPerPage);
  const currentResults = availableResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  // Reset current page when available results change
  useEffect(() => {
    setCurrentPage(1);
  }, [availableResults.length]);

  const generateUsernameVariations = (
    length: number,
    includeNums: boolean,
    maxNums: number,
    count: number
  ): string[] => {
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const vowels = "aeiou";
    const numbers = "0123456789";
    const commonPrefixes = [
      "",
      "the",
      "my",
      "its",
      "im",
      "real",
      "official",
      "x",
      "z",
      "v",
      "i",
      "a",
    ];
    const commonSuffixes = [
      "",
      "x",
      "z",
      "ly",
      "er",
      "ie",
      "y",
      "s",
      "hq",
      "pro",
      "hub",
      "zone",
      "lab",
    ];
    const patterns = [
      "cvcv",
      "vcvc",
      "cvcvc",
      "vcvcv",
      "cvccv",
      "vccvc",
      "ccvcv",
      "vccvc",
    ]; // More patterns

    const generated: Set<string> = new Set();

    // Strategy 1: Pattern-based generation
    for (let i = 0; generated.size < count / 2 && i < count * 2; i++) {
      // Try to generate half from patterns
      let username = "";
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      for (const char of pattern) {
        if (username.length >= length) break;
        if (char === "c") {
          username += consonants[Math.floor(Math.random() * consonants.length)];
        } else {
          username += vowels[Math.floor(Math.random() * vowels.length)];
        }
      }

      // Adjust length to exact
      while (username.length < length) {
        const chars = username.length % 2 === 0 ? consonants : vowels;
        username += chars[Math.floor(Math.random() * chars.length)];
      }
      username = username.substring(0, length); // Ensure exact length

      // Integrate numbers if requested
      if (includeNums && maxNums > 0) {
        const numCount = Math.floor(Math.random() * maxNums) + 1; // 1 to maxNumbers
        const tempUsernameArray = username.split("");
        const positionsToReplace: number[] = [];
        while (
          positionsToReplace.length < numCount &&
          positionsToReplace.length < length
        ) {
          const pos = Math.floor(Math.random() * length);
          if (!positionsToReplace.includes(pos)) {
            positionsToReplace.push(pos);
          }
        }
        positionsToReplace.forEach((pos) => {
          tempUsernameArray[pos] =
            numbers[Math.floor(Math.random() * numbers.length)];
        });
        username = tempUsernameArray.join("");
      }
      generated.add(username);
    }

    // Strategy 2: Prefix/Suffix combinations with random core
    for (let i = 0; generated.size < count && i < count * 2; i++) {
      // Try to fill remaining with prefix/suffix
      const prefix =
        commonPrefixes[Math.floor(Math.random() * commonPrefixes.length)];
      const suffix =
        commonSuffixes[Math.floor(Math.random() * commonSuffixes.length)];
      let coreLength = length - prefix.length - suffix.length;

      if (coreLength < 1) {
        // If prefix/suffix already exceed length, skip or adjust
        coreLength = 1; // Ensure at least one core char
      }

      let core = "";
      for (let j = 0; j < coreLength; j++) {
        const chars = Math.random() < 0.5 ? consonants : vowels;
        core += chars[Math.floor(Math.random() * chars.length)];
      }

      let username = prefix + core + suffix;
      username = username.substring(0, length); // Ensure exact length

      // Integrate numbers if requested
      if (includeNums && maxNums > 0) {
        const numCount = Math.floor(Math.random() * maxNums) + 1; // 1 to maxNumbers
        const tempUsernameArray = username.split("");
        const positionsToReplace: number[] = [];
        while (
          positionsToReplace.length < numCount &&
          positionsToReplace.length < length
        ) {
          const pos = Math.floor(Math.random() * length);
          if (!positionsToReplace.includes(pos)) {
            positionsToReplace.push(pos);
          }
        }
        positionsToReplace.forEach((pos) => {
          tempUsernameArray[pos] =
            numbers[Math.floor(Math.random() * numbers.length)];
        });
        username = tempUsernameArray.join("");
      }
      generated.add(username);
    }

    return Array.from(generated);
  };

  const simulateAvailabilityCheck = async (
    username: string
  ): Promise<{
    isAvailable: boolean;
    popularity: "rare" | "uncommon" | "common";
  }> => {
    try {
      const response = await fetch(
        `/api/check-username?username=${encodeURIComponent(username)}`
      );
      const data = await response.json();
      const isAvailable = data.isAvailable ?? false;

      // Determine popularity based on username length and availability
      let popularity: "rare" | "uncommon" | "common";
      if (username.length <= 5 && isAvailable) popularity = "rare";
      else if (username.length <= 7 && isAvailable) popularity = "uncommon";
      else popularity = "common";

      return { isAvailable, popularity };
    } catch (error) {
      // Fallback to unavailable if error occurs
      return { isAvailable: false, popularity: "common" };
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setResults([]);
    setTotalChecked(0);
    setCurrentPage(1);
    setShowOverlay(true); // Open overlay immediately

    const generatedUsernames = generateUsernameVariations(
      usernameLength[0],
      includeNumbers,
      maxNumbers[0],
      numUsernamesToCheck[0]
    );

    const availableUsernames: UsernameResult[] = [];
    let checkedCount = 0;

    for (const username of generatedUsernames) {
      checkedCount++;
      setTotalChecked(checkedCount);

      // Call API to check availability
      const { isAvailable, popularity } = await simulateAvailabilityCheck(
        username
      );
      if (isAvailable) {
        availableUsernames.push({ username, isAvailable, popularity });
        setResults([...availableUsernames]); // Update results dynamically
      }
      if (checkedCount >= numUsernamesToCheck[0]) break;
    }

    setIsLoading(false);
  };

  const copyToClipboard = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsername(username);
      toast({
        title: "Copied!",
        description: `Username "${username}" copied to clipboard`,
      });
      setTimeout(() => setCopiedUsername(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const getRarityColor = (popularity: string) => {
    switch (popularity) {
      case "rare":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "uncommon":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const handleManualCheck = async () => {
    setIsManualChecking(true);
    const result = await simulateAvailabilityCheck(manualUsername);
    setManualCheckResult({ username: manualUsername, ...result });
    setIsManualChecking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Find Rare Instagram Usernames Instantly
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Discover unique and available Instagram usernames tailored to your
            preferences. Stand out with a memorable handle that's truly yours.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Customize Your Search</CardTitle>
            <CardDescription>
              Set your preferences to find the perfect username
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="length" className="text-sm font-medium">
                  Username Length: {usernameLength[0]} characters
                </Label>
                <Slider
                  id="length"
                  min={3}
                  max={15}
                  step={1}
                  value={usernameLength}
                  onValueChange={setUsernameLength}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>3</span>
                  <span>15</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="count" className="text-sm font-medium">
                  Usernames to check: {numUsernamesToCheck[0]}
                </Label>
                <Slider
                  id="count"
                  min={100}
                  max={5000}
                  step={100}
                  value={numUsernamesToCheck}
                  onValueChange={setNumUsernamesToCheck}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>100</span>
                  <span>5000</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="numbers"
                    checked={includeNumbers}
                    onCheckedChange={setIncludeNumbers}
                  />
                  <Label htmlFor="numbers" className="text-sm font-medium">
                    Include numbers
                  </Label>
                </div>

                {includeNumbers && (
                  <div className="space-y-3 pl-6">
                    <Label htmlFor="maxNumbers" className="text-sm font-medium">
                      Max numbers: {maxNumbers[0]}
                    </Label>
                    <Slider
                      id="maxNumbers"
                      min={1}
                      max={5}
                      step={1}
                      value={maxNumbers}
                      onValueChange={setMaxNumbers}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1</span>
                      <span>5</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking... ({totalChecked} scanned)
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Find Usernames
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowOverlay(true)}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
              >
                Show Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Check Form */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Manually Check Username</CardTitle>
            <CardDescription>
              Enter a username to check its availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="manual-username" className="text-sm font-medium">
                Username:
              </Label>
              <Input
                id="manual-username"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleManualCheck}
              disabled={isManualChecking}
              className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
            >
              {isManualChecking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Check Availability
                </>
              )}
            </Button>

            {manualCheckResult && (
              <div className="mt-4">
                {manualCheckResult.isAvailable ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="mr-2 h-4 w-4" />@
                    {manualCheckResult.username} is available (
                    {manualCheckResult.popularity})
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    <X className="mr-2 h-4 w-4" />@{manualCheckResult.username}{" "}
                    is not available
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
                <h3 className="text-lg font-semibold mb-2">
                  Scanning Usernames...
                </h3>
                <p className="text-gray-600">
                  Checked {totalChecked} usernames, Found
                  {availableResults.length}
                </p>
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(totalChecked / numUsernamesToCheck[0]) * 100}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Results Preview */}
        {availableResults.length > 0 && !isLoading && !showOverlay && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-between">
                <span className="flex items-center">
                  <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
                  Found {availableResults.length} Available Usernames
                </span>
                <Button
                  onClick={() => setShowOverlay(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  View All Results
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableResults.slice(0, 6).map((result, index) => (
                  <div key={index} className="group relative">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(result.username)}
                      className="w-full justify-between hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 p-4 h-auto"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-base">
                          @{result.username}
                        </span>
                        <Badge
                          className={`text-xs mt-1 ${getRarityColor(
                            result.popularity
                          )}`}
                        >
                          {result.popularity}
                        </Badge>
                      </div>
                      {copiedUsername === result.username ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Overlay Header */}
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Available Usernames</h2>
                  <p className="text-purple-100">
                    Found {availableResults.length} available usernames
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                    className="text-white hover:bg-white/20"
                  >
                    {viewMode === "grid" ? (
                      <List className="h-4 w-4" />
                    ) : (
                      <Grid className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOverlay(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div
                className={
                  viewMode === "grid"
                    ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    : "space-y-2"
                }
              >
                {currentResults.map((result, index) => (
                  <div key={index} className="group relative">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(result.username)}
                      className={`w-full justify-between hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 ${
                        viewMode === "list" ? "p-3 h-auto" : "p-4 h-auto"
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-base">
                          @{result.username}
                        </span>
                        <Badge
                          className={`text-xs mt-1 ${getRarityColor(
                            result.popularity
                          )}`}
                        >
                          {result.popularity}
                        </Badge>
                      </div>
                      {copiedUsername === result.username ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * resultsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * resultsPerPage,
                    availableResults.length
                  )}{" "}
                  of {availableResults.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
