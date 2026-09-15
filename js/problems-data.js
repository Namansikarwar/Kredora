/**
 * SkillProof Coding Arena — Problems Dataset & Progress Tracker
 * Full LeetCode / HackerRank style problem specifications with verified test suites.
 */

const CODING_PROBLEMS = [
  {
    id: "two-sum",
    number: 1,
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays & Hashing",
    skill: "JavaScript",
    acceptance: "53.8%",
    points: 2,
    description: `
      <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>
      <p class="mt-3">You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
      <p class="mt-3">You can return the answer in any order.</p>
    `,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "nums[1] + nums[2] == 6, we return [1, 2]."
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]"
      }
    ],
    constraints: [
      "2 <= nums.length <= 10<sup>4</sup>",
      "-10<sup>9</sup> <= nums[i] <= 10<sup>9</sup>",
      "-10<sup>9</sup> <= target <= 10<sup>9</sup>",
      "Only one valid answer exists."
    ],
    functionName: "twoSum",
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your code here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`
    },
    sampleTestCases: [
      { input: [[2, 7, 11, 15], 9], inputDisplay: "nums = [2,7,11,15], target = 9", expected: [0, 1] },
      { input: [[3, 2, 4], 6], inputDisplay: "nums = [3,2,4], target = 6", expected: [1, 2] },
      { input: [[3, 3], 6], inputDisplay: "nums = [3,3], target = 6", expected: [0, 1] }
    ],
    hiddenTestCases: [
      { input: [[1, 5, 8, 12, 19, 25], 27], inputDisplay: "nums = [1,5,8,12,19,25], target = 27", expected: [2, 4] },
      { input: [[-3, 4, 3, 90], 0], inputDisplay: "nums = [-3,4,3,90], target = 0", expected: [0, 2] },
      { input: [[0, 4, 3, 0], 0], inputDisplay: "nums = [0,4,3,0], target = 0", expected: [0, 3] },
      { input: [[1000000, 500, -1000000], -999500], inputDisplay: "nums = [1000000,500,-1000000], target = -999500", expected: [1, 2] }
    ],
    hints: [
      "A brute force approach would search all pairs, taking O(n²) time.",
      "Can you use a Hash Map to store elements you have already seen in O(n) time?"
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Optimal Approach: One-pass Hash Table</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">While iterating through the array, check if <code>target - nums[i]</code> is already present in the map. If it is, return its index and the current index. Otherwise, store <code>nums[i]</code> with index <code>i</code>.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(N)</div>
    `
  },
  {
    id: "valid-palindrome",
    number: 2,
    title: "Valid Palindrome",
    difficulty: "Easy",
    category: "Two Pointers",
    skill: "JavaScript",
    acceptance: "48.2%",
    points: 2,
    description: `
      <p>A phrase is a <strong>palindrome</strong> if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.</p>
      <p class="mt-3">Given a string <code>s</code>, return <code>true</code> <em>if it is a palindrome, or</em> <code>false</code> <em>otherwise</em>.</p>
    `,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.'
      },
      {
        input: 's = "race a car"',
        output: "false",
        explanation: '"raceacar" is not a palindrome.'
      },
      {
        input: 's = " "',
        output: "true",
        explanation: "s is an empty string \"\" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome."
      }
    ],
    constraints: [
      "1 <= s.length <= 2 * 10<sup>5</sup>",
      "<code>s</code> consists only of printable ASCII characters."
    ],
    functionName: "isPalindrome",
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // Your code here
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0;
  let right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
      python: `def isPalindrome(s: str) -> bool:
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;
            left++;
            right--;
        }
        return true;
    }
}`
    },
    sampleTestCases: [
      { input: ["A man, a plan, a canal: Panama"], inputDisplay: 's = "A man, a plan, a canal: Panama"', expected: true },
      { input: ["race a car"], inputDisplay: 's = "race a car"', expected: false },
      { input: [" "], inputDisplay: 's = " "', expected: true }
    ],
    hiddenTestCases: [
      { input: ["0P"], inputDisplay: 's = "0P"', expected: false },
      { input: ["ab_a"], inputDisplay: 's = "ab_a"', expected: true },
      { input: ["Was it a car or a cat I saw?"], inputDisplay: 's = "Was it a car or a cat I saw?"', expected: true }
    ],
    hints: [
      "Consider using two pointers: one starting from the beginning and one from the end.",
      "Filter out any non-alphanumeric characters before comparing."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers in Place</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain two pointers moving towards the center, skipping non-alphanumeric characters and comparing characters case-insensitively.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "valid-parentheses",
    number: 3,
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    skill: "JavaScript",
    acceptance: "41.5%",
    points: 2,
    description: `
      <p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
      <p class="mt-3">An input string is valid if:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-inkdim">
        <li>Open brackets must be closed by the same type of brackets.</li>
        <li>Open brackets must be closed in the correct order.</li>
        <li>Every close bracket has a corresponding open bracket of the same type.</li>
      </ul>
    `,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
      { input: 's = "([])"', output: "true" }
    ],
    constraints: [
      "1 <= s.length <= 10<sup>4</sup>",
      "<code>s</code> consists of parentheses only <code>'()[]{}'</code>."
    ],
    functionName: "isValid",
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Your code here
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (map[ch]) {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
      python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,
      java: `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`
    },
    sampleTestCases: [
      { input: ["()"], inputDisplay: 's = "()"', expected: true },
      { input: ["()[]{}"], inputDisplay: 's = "()[]{}"', expected: true },
      { input: ["(]"], inputDisplay: 's = "(]"', expected: false },
      { input: ["([])"], inputDisplay: 's = "([])"', expected: true }
    ],
    hiddenTestCases: [
      { input: ["["], inputDisplay: 's = "["', expected: false },
      { input: ["]"], inputDisplay: 's = "]"', expected: false },
      { input: ["{[]}(){[()()]}"], inputDisplay: 's = "{[]}(){[()()]}"', expected: true },
      { input: ["(((((((((())))))))))"], inputDisplay: 's = "(((((((((())))))))))"', expected: true }
    ],
    hints: [
      "Use a stack to push open brackets.",
      "When a closing bracket is found, verify it matches the most recent open bracket on top of the stack."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Stack-based evaluation</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">A Stack allows Last-In First-Out (LIFO) pairing of nested opening and closing parentheses.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(N)</div>
    `
  },
  {
    id: "maximum-subarray",
    number: 4,
    title: "Maximum Subarray",
    difficulty: "Medium",
    category: "Dynamic Programming",
    skill: "Algorithms",
    acceptance: "50.4%",
    points: 4,
    description: `
      <p>Given an integer array <code>nums</code>, find the subarray with the largest sum, and return <em>its sum</em>.</p>
      <p class="mt-3">A <strong>subarray</strong> is a contiguous non-empty sequence of elements within an array.</p>
    `,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6."
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1."
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The subarray [5,4,-1,7,8] has the largest sum 23."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10<sup>5</sup>",
      "-10<sup>4</sup> <= nums[i] <= 10<sup>4</sup>"
    ],
    functionName: "maxSubArray",
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Your code here (Kadane's Algorithm)
  let maxSoFar = nums[0];
  let currentMax = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentMax = Math.max(nums[i], currentMax + nums[i]);
    maxSoFar = Math.max(maxSoFar, currentMax);
  }

  return maxSoFar;
}`,
      python: `def maxSubArray(nums: list[int]) -> int:
    max_so_far = nums[0]
    current = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        max_so_far = max(max_so_far, current)
    return max_so_far`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        int max = nums[0], current = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            max = Math.max(max, current);
        }
        return max;
    }
}`
    },
    sampleTestCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], inputDisplay: "nums = [-2,1,-3,4,-1,2,1,-5,4]", expected: 6 },
      { input: [[1]], inputDisplay: "nums = [1]", expected: 1 },
      { input: [[5, 4, -1, 7, 8]], inputDisplay: "nums = [5,4,-1,7,8]", expected: 23 }
    ],
    hiddenTestCases: [
      { input: [[-1]], inputDisplay: "nums = [-1]", expected: -1 },
      { input: [[-5, -2, -8, -1]], inputDisplay: "nums = [-5,-2,-8,-1]", expected: -1 },
      { input: [[2, -1, 3, 4, -5, 10]], inputDisplay: "nums = [2,-1,3,4,-5,10]", expected: 13 }
    ],
    hints: [
      "Kadane's Algorithm: at each position, decide whether to append to the previous running sum or start fresh."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Kadane's Algorithm</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain a running sum: <code>current = Math.max(nums[i], current + nums[i])</code>. If <code>current</code> dips lower than <code>nums[i]</code>, start a fresh subarray at <code>nums[i]</code>.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "container-with-most-water",
    number: 5,
    title: "Container With Most Water",
    difficulty: "Medium",
    category: "Two Pointers",
    skill: "JavaScript",
    acceptance: "54.6%",
    points: 4,
    description: `
      <p>You are given an integer array <code>height</code> of length <code>n</code>. There are <code>n</code> vertical lines drawn such that the two endpoints of the <code>i<sup>th</sup></code> line are <code>(i, 0)</code> and <code>(i, height[i])</code>.</p>
      <p class="mt-3">Find two lines that together with the x-axis form a container, such that the container contains the most water.</p>
      <p class="mt-3">Return <em>the maximum amount of water a container can store</em>.</p>
    `,
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "The vertical lines are [1,8,6,2,5,4,8,3,7]. The max water is between index 1 and index 8 with area min(8, 7) * (8 - 1) = 49."
      },
      {
        input: "height = [1,1]",
        output: "1"
      }
    ],
    constraints: [
      "n == height.length",
      "2 <= n <= 10<sup>5</sup>",
      "0 <= height[i] <= 10<sup>4</sup>"
    ],
    functionName: "maxArea",
    starterCode: {
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Your code here
  let left = 0;
  let right = height.length - 1;
  let max = 0;

  while (left < right) {
    const w = right - left;
    const h = Math.min(height[left], height[right]);
    max = Math.max(max, w * h);

    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return max;
}`,
      python: `def maxArea(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_w = 0
    while left < right:
        max_w = max(max_w, (right - left) * min(height[left], height[right]))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_w`,
      java: `class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, max = 0;
        while (left < right) {
            int h = Math.min(height[left], height[right]);
            max = Math.max(max, h * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return max;
    }
}`
    },
    sampleTestCases: [
      { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], inputDisplay: "height = [1,8,6,2,5,4,8,3,7]", expected: 49 },
      { input: [[1, 1]], inputDisplay: "height = [1,1]", expected: 1 }
    ],
    hiddenTestCases: [
      { input: [[4, 3, 2, 1, 4]], inputDisplay: "height = [4,3,2,1,4]", expected: 16 },
      { input: [[1, 2, 1]], inputDisplay: "height = [1,2,1]", expected: 2 },
      { input: [[2, 3, 4, 5, 18, 17, 6]], inputDisplay: "height = [2,3,4,5,18,17,6]", expected: 17 }
    ],
    hints: [
      "The area is limited by the shorter line.",
      "Moving the pointer with the greater height cannot possibly increase the area, so always move the pointer pointing to the shorter line."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers Greedy</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Starting with maximum width (at opposite ends), contract inward by shifting the smaller boundary towards larger heights.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "longest-substring-without-repeating-characters",
    number: 6,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window",
    skill: "JavaScript",
    acceptance: "34.5%",
    points: 4,
    description: `
      <p>Given a string <code>s</code>, find the length of the <strong>longest substring</strong> without repeating characters.</p>
    `,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with the length of 3. Note that the answer must be a substring, "pwke" is a subsequence and not a substring.'
      }
    ],
    constraints: [
      "0 <= s.length <= 5 * 10<sup>4</sup>",
      "<code>s</code> consists of English letters, digits, symbols and spaces."
    ],
    functionName: "lengthOfLongestSubstring",
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Your code here
  const map = new Map();
  let maxLen = 0;
  let start = 0;

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (map.has(char) && map.get(char) >= start) {
      start = map.get(char) + 1;
    }
    map.set(char, i);
    maxLen = Math.max(maxLen, i - start + 1);
  }

  return maxLen;
}`,
      python: `def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    start = 0
    max_len = 0
    for i, c in enumerate(s):
        if c in char_map and char_map[c] >= start:
            start = char_map[c] + 1
        char_map[c] = i
        max_len = max(max_len, i - start + 1)
    return max_len`,
      java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int start = 0, max = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (map.containsKey(c) && map.get(c) >= start) {
                start = map.get(c) + 1;
            }
            map.put(c, i);
            max = Math.max(max, i - start + 1);
        }
        return max;
    }
}`
    },
    sampleTestCases: [
      { input: ["abcabcbb"], inputDisplay: 's = "abcabcbb"', expected: 3 },
      { input: ["bbbbb"], inputDisplay: 's = "bbbbb"', expected: 1 },
      { input: ["pwwkew"], inputDisplay: 's = "pwwkew"', expected: 3 }
    ],
    hiddenTestCases: [
      { input: [""], inputDisplay: 's = ""', expected: 0 },
      { input: [" "], inputDisplay: 's = " "', expected: 1 },
      { input: ["au"], inputDisplay: 's = "au"', expected: 2 },
      { input: ["dvdf"], inputDisplay: 's = "dvdf"', expected: 3 }
    ],
    hints: [
      "Use a sliding window with two pointers representing the current window.",
      "Store each character's last seen index in a hash map to advance the window forward instantly."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Sliding Window with Hash Map</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain window bounds [start, i]. When encountering a repeated character, shift <code>start</code> right past the previous occurrence.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(min(m, n))</div>
    `
  },
  {
    id: "climbing-stairs",
    number: 7,
    title: "Climbing Stairs",
    difficulty: "Easy",
    category: "Dynamic Programming",
    skill: "Algorithms",
    acceptance: "52.7%",
    points: 2,
    description: `
      <p>You are climbing a staircase. It takes <code>n</code> steps to reach the top.</p>
      <p class="mt-3">Each time you can either climb <code>1</code> or <code>2</code> steps. In how many distinct ways can you climb to the top?</p>
    `,
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps."
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1."
      }
    ],
    constraints: [
      "1 <= n <= 45"
    ],
    functionName: "climbStairs",
    starterCode: {
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // Your code here (Fibonacci recurrence)
  if (n <= 2) return n;
  let prev1 = 2;
  let prev2 = 1;

  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}`,
      python: `def climbStairs(n: int) -> int:
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`,
      java: `class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
}`
    },
    sampleTestCases: [
      { input: [2], inputDisplay: "n = 2", expected: 2 },
      { input: [3], inputDisplay: "n = 3", expected: 3 },
      { input: [4], inputDisplay: "n = 4", expected: 5 }
    ],
    hiddenTestCases: [
      { input: [1], inputDisplay: "n = 1", expected: 1 },
      { input: [5], inputDisplay: "n = 5", expected: 8 },
      { input: [8], inputDisplay: "n = 8", expected: 34 }
    ],
    hints: [
      "To reach step n, you must take 1 step from n-1, or 2 steps from n-2.",
      "Thus, ways(n) = ways(n-1) + ways(n-2). This is Fibonacci sequence."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Bottom-Up Dynamic Programming</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Notice that reaching step <code>n</code> requires either stepping from <code>n-1</code> or <code>n-2</code>. Only the last two values need to be remembered.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "trapping-rain-water",
    number: 8,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    category: "Two Pointers",
    skill: "Algorithms",
    acceptance: "60.1%",
    points: 8,
    description: `
      <p>Given <code>n</code> non-negative integers representing an elevation map where the width of each bar is <code>1</code>, compute how much water it can trap after raining.</p>
    `,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The elevation map [0,1,0,2,1,0,1,3,2,1,2,1] traps 6 units of rain water."
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9"
      }
    ],
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10<sup>4</sup>",
      "0 <= height[i] <= 10<sup>5</sup>"
    ],
    functionName: "trap",
    starterCode: {
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
  // Two-pointer approach
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let totalWater = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        totalWater += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        totalWater += rightMax - height[right];
      }
      right--;
    }
  }

  return totalWater;
}`,
      python: `def trap(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water`,
      java: `class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0, total = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left];
                else total += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right];
                else total += rightMax - height[right];
                right--;
            }
        }
        return total;
    }
}`
    },
    sampleTestCases: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], inputDisplay: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], inputDisplay: "height = [4,2,0,3,2,5]", expected: 9 }
    ],
    hiddenTestCases: [
      { input: [[2, 0, 2]], inputDisplay: "height = [2,0,2]", expected: 2 },
      { input: [[3, 0, 0, 2, 0, 4]], inputDisplay: "height = [3,0,0,2,0,4]", expected: 10 },
      { input: [[0]], inputDisplay: "height = [0]", expected: 0 }
    ],
    hints: [
      "Water trapped at index i is determined by min(max_left, max_right) - height[i].",
      "Can we calculate this in O(1) space with two pointers?"
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers O(1) Space</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain <code>leftMax</code> and <code>rightMax</code>. Advance the pointer with smaller height, collecting trapped water.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "binary-search",
    number: 9,
    title: "Binary Search",
    difficulty: "Easy",
    category: "Binary Search",
    skill: "Algorithms",
    acceptance: "57.3%",
    points: 2,
    description: `
      <p>Given an array of integers <code>nums</code> which is sorted in ascending order, and an integer <code>target</code>, write a function to search <code>target</code> in <code>nums</code>. If <code>target</code> exists, then return its index. Otherwise, return <code>-1</code>.</p>
      <p class="mt-3">You must write an algorithm with <code>O(log n)</code> runtime complexity.</p>
    `,
    examples: [
      {
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
        explanation: "9 exists in nums and its index is 4"
      },
      {
        input: "nums = [-1,0,3,5,9,12], target = 2",
        output: "-1",
        explanation: "2 does not exist in nums so return -1"
      }
    ],
    constraints: [
      "1 <= nums.length <= 10<sup>4</sup>",
      "-10<sup>4</sup> < nums[i], target < 10<sup>4</sup>",
      "All the integers in <code>nums</code> are unique.",
      "<code>nums</code> is sorted in ascending order."
    ],
    functionName: "search",
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}`,
      python: `def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`
    },
    sampleTestCases: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], inputDisplay: "nums = [-1,0,3,5,9,12], target = 9", expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], inputDisplay: "nums = [-1,0,3,5,9,12], target = 2", expected: -1 }
    ],
    hiddenTestCases: [
      { input: [[5], 5], inputDisplay: "nums = [5], target = 5", expected: 0 },
      { input: [[2, 5], 5], inputDisplay: "nums = [2,5], target = 5", expected: 1 },
      { input: [[2, 5], 2], inputDisplay: "nums = [2,5], target = 2", expected: 0 },
      { input: [[1, 3, 5, 7, 9, 11], 8], inputDisplay: "nums = [1,3,5,7,9,11], target = 8", expected: -1 }
    ],
    hints: [
      "Divide and conquer: calculate mid index and adjust boundary accordingly."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Standard Binary Search</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Halves the search space at each iteration.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(log N) | Space Complexity: O(1)</div>
    `
  },
  {
    id: "coin-change",
    number: 10,
    title: "Coin Change",
    difficulty: "Medium",
    category: "Dynamic Programming",
    skill: "Algorithms",
    acceptance: "43.1%",
    points: 4,
    description: `
      <p>You are given an integer array <code>coins</code> representing coins of different denominations and an integer <code>amount</code> representing a total amount of money.</p>
      <p class="mt-3">Return <em>the fewest number of coins that you need to make up that amount</em>. If that amount of money cannot be made up by any combination of the coins, return <code>-1</code>.</p>
      <p class="mt-3">You may assume that you have an infinite number of each kind of coin.</p>
    `,
    examples: [
      {
        input: "coins = [1,2,5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1"
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1"
      },
      {
        input: "coins = [1], amount = 0",
        output: "0"
      }
    ],
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2<sup>31</sup> - 1",
      "0 <= amount <= 10<sup>4</sup>"
    ],
    functionName: "coinChange",
    starterCode: {
      javascript: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i - coin >= 0) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
      python: `def coinChange(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
      java: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (i - coin >= 0) {
                    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`
    },
    sampleTestCases: [
      { input: [[1, 2, 5], 11], inputDisplay: "coins = [1,2,5], amount = 11", expected: 3 },
      { input: [[2], 3], inputDisplay: "coins = [2], amount = 3", expected: -1 },
      { input: [[1], 0], inputDisplay: "coins = [1], amount = 0", expected: 0 }
    ],
    hiddenTestCases: [
      { input: [[186, 419, 83, 408], 6249], inputDisplay: "coins = [186,419,83,408], amount = 6249", expected: 20 },
      { input: [[2, 5, 10, 1], 27], inputDisplay: "coins = [2,5,10,1], amount = 27", expected: 4 }
    ],
    hints: [
      "Use Dynamic Programming where dp[i] is the minimum coins needed to make amount i.",
      "dp[i] = min(dp[i - coin] + 1) for all coin in coins."
    ],
    editorial: `
      <h3 class="font-display font-semibold text-base text-white mb-2">Bottom-Up DP</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">For every sub-amount from 1 up to <code>amount</code>, test each coin denomination and take the minimum.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(S * N) | Space Complexity: O(S) where S is amount</div>
    `
  }
];

/**
 * Progress Tracker: Manages user's solved questions, submission history,
 * streaks, and connects directly to SkillProof verified evidence ledger.
 */
const ProgressTracker = {
  SOLVED_KEY: "skillproof_solved_problems",
  SUBMISSIONS_KEY: "skillproof_problem_submissions",
  EVIDENCE_KEY: "skillproof_user_evidence",

  initDefaults() {
    // Seed initial demo solved problem so new users immediately see progress
    if (!localStorage.getItem(this.SOLVED_KEY)) {
      const initialSolved = {
        "two-sum": {
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          solvedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          runtime: "52 ms",
          memory: "42.1 MB",
          language: "JavaScript"
        },
        "valid-palindrome": {
          id: "valid-palindrome",
          title: "Valid Palindrome",
          difficulty: "Easy",
          solvedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
          runtime: "64 ms",
          memory: "44.2 MB",
          language: "JavaScript"
        }
      };
      localStorage.setItem(this.SOLVED_KEY, JSON.stringify(initialSolved));
    }
  },

  getSolvedMap() {
    this.initDefaults();
    try {
      const raw = localStorage.getItem(this.SOLVED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  isSolved(problemId) {
    const map = this.getSolvedMap();
    return !!map[problemId];
  },

  markSolved(problem, submission) {
    const map = this.getSolvedMap();
    const wasAlreadySolved = !!map[problem.id];

    map[problem.id] = {
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      category: problem.category,
      solvedAt: new Date().toISOString(),
      runtime: submission.runtime,
      memory: submission.memory,
      language: submission.language || "JavaScript"
    };

    localStorage.setItem(this.SOLVED_KEY, JSON.stringify(map));

    // Also record into submission history
    this.recordSubmission(problem.id, {
      status: "Accepted",
      runtime: submission.runtime,
      memory: submission.memory,
      language: submission.language || "JavaScript",
      code: submission.code,
      timestamp: new Date().toISOString()
    });

    // Automatically create verified SkillProof evidence record!
    this.logVerifiedSkillProofEvidence(problem, submission, wasAlreadySolved);

    return { wasAlreadySolved };
  },

  recordSubmission(problemId, record) {
    try {
      const raw = localStorage.getItem(this.SUBMISSIONS_KEY);
      const subs = raw ? JSON.parse(raw) : {};
      if (!subs[problemId]) subs[problemId] = [];
      subs[problemId].unshift(record);
      // Keep last 15 submissions per problem
      if (subs[problemId].length > 15) subs[problemId] = subs[problemId].slice(0, 15);
      localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(subs));
    } catch (e) {
      console.error("Failed to save submission:", e);
    }
  },

  getSubmissions(problemId) {
    try {
      const raw = localStorage.getItem(this.SUBMISSIONS_KEY);
      const subs = raw ? JSON.parse(raw) : {};
      return subs[problemId] || [];
    } catch (e) {
      return [];
    }
  },

  logVerifiedSkillProofEvidence(problem, submission, wasAlreadySolved) {
    try {
      const raw = localStorage.getItem(this.EVIDENCE_KEY);
      const evidenceList = raw ? JSON.parse(raw) : [];

      const newRecord = {
        id: "ev_" + Date.now(),
        type: "problem",
        name: problem.title,
        skill: problem.skill || "JavaScript",
        category: problem.category,
        detail: `Solved in ${submission.runtime} · ${problem.difficulty} · ${problem.category}`,
        timestamp: "Just now",
        verified: true,
        points: problem.points || 2
      };

      evidenceList.unshift(newRecord);
      localStorage.setItem(this.EVIDENCE_KEY, JSON.stringify(evidenceList));

      // Trigger custom event so any active dashboard listener knows
      window.dispatchEvent(new CustomEvent("skillproof_evidence_updated", { detail: newRecord }));
    } catch (e) {
      console.error("Evidence record error:", e);
    }
  },

  getStats() {
    const solvedMap = this.getSolvedMap();
    const solvedList = Object.values(solvedMap);

    const total = CODING_PROBLEMS.length;
    const solvedTotal = solvedList.length;

    let easyTotal = 0, easySolved = 0;
    let mediumTotal = 0, mediumSolved = 0;
    let hardTotal = 0, hardSolved = 0;

    CODING_PROBLEMS.forEach((p) => {
      if (p.difficulty === "Easy") {
        easyTotal++;
        if (solvedMap[p.id]) easySolved++;
      } else if (p.difficulty === "Medium") {
        mediumTotal++;
        if (solvedMap[p.id]) mediumSolved++;
      } else if (p.difficulty === "Hard") {
        hardTotal++;
        if (solvedMap[p.id]) hardSolved++;
      }
    });

    const completionRate = total > 0 ? Math.round((solvedTotal / total) * 100) : 0;

    return {
      total,
      solvedTotal,
      completionRate,
      easy: { solved: easySolved, total: easyTotal },
      medium: { solved: mediumSolved, total: mediumTotal },
      hard: { solved: hardSolved, total: hardTotal },
      streakDays: Math.min(solvedTotal + 3, 14)
    };
  }
};

// Expose globally
window.CODING_PROBLEMS = CODING_PROBLEMS;
window.ProgressTracker = ProgressTracker;
