const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/user-stats-DeqBXm8I.js","assets/preload-helper-DFLZRFHf.js","assets/auth-Mq3JVvbZ.js","assets/auth-CW-8rB5-.css"])))=>i.map(i=>d[i]);
import{_ as b}from"./preload-helper-DFLZRFHf.js";const u=[{id:"two-sum",number:1,title:"Two Sum",difficulty:"Easy",category:"Arrays & Hashing",skill:"JavaScript",acceptance:"53.8%",points:2,description:`
      <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>
      <p class="mt-3">You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
      <p class="mt-3">You can return the answer in any order.</p>
    `,examples:[{input:"nums = [2,7,11,15], target = 9",output:"[0,1]",explanation:"Because nums[0] + nums[1] == 9, we return [0, 1]."},{input:"nums = [3,2,4], target = 6",output:"[1,2]",explanation:"nums[1] + nums[2] == 6, we return [1, 2]."},{input:"nums = [3,3], target = 6",output:"[0,1]"}],constraints:["2 <= nums.length <= 10<sup>4</sup>","-10<sup>9</sup> <= nums[i] <= 10<sup>9</sup>","-10<sup>9</sup> <= target <= 10<sup>9</sup>","Only one valid answer exists."],functionName:"twoSum",starterCode:{javascript:`/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your code here
  
}`,python:`def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    pass`,java:`class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[0];
    }
}`},solutionCode:{javascript:`function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,python:`def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,java:`class Solution {
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
}`},sampleTestCases:[{input:[[2,7,11,15],9],inputDisplay:"nums = [2,7,11,15], target = 9",expected:[0,1]},{input:[[3,2,4],6],inputDisplay:"nums = [3,2,4], target = 6",expected:[1,2]},{input:[[3,3],6],inputDisplay:"nums = [3,3], target = 6",expected:[0,1]}],hints:["A brute force approach would search all pairs, taking O(n²) time.","Can you use a Hash Map to store elements you have already seen in O(n) time?"],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Optimal Approach: One-pass Hash Table</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">While iterating through the array, check if <code>target - nums[i]</code> is already present in the map. If it is, return its index and the current index. Otherwise, store <code>nums[i]</code> with index <code>i</code>.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(N)</div>
    `},{id:"valid-palindrome",number:2,title:"Valid Palindrome",difficulty:"Easy",category:"Two Pointers",skill:"JavaScript",acceptance:"48.2%",points:2,description:`
      <p>A phrase is a <strong>palindrome</strong> if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.</p>
      <p class="mt-3">Given a string <code>s</code>, return <code>true</code> <em>if it is a palindrome, or</em> <code>false</code> <em>otherwise</em>.</p>
    `,examples:[{input:'s = "A man, a plan, a canal: Panama"',output:"true",explanation:'"amanaplanacanalpanama" is a palindrome.'},{input:'s = "race a car"',output:"false",explanation:'"raceacar" is not a palindrome.'},{input:'s = " "',output:"true",explanation:"s is an empty string after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome."}],constraints:["1 <= s.length <= 2 * 10<sup>5</sup>","<code>s</code> consists only of printable ASCII characters."],functionName:"isPalindrome",starterCode:{javascript:`/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // Write your code here
  
}`,python:`def isPalindrome(s: str) -> bool:
    # Write your solution here
    pass`,java:`class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
        return false;
    }
}`},solutionCode:{javascript:`function isPalindrome(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0;
  let right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }
  return true;
}`,python:`def isPalindrome(s: str) -> bool:
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]`,java:`class Solution {
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
}`},sampleTestCases:[{input:["A man, a plan, a canal: Panama"],inputDisplay:'s = "A man, a plan, a canal: Panama"',expected:!0},{input:["race a car"],inputDisplay:'s = "race a car"',expected:!1},{input:[" "],inputDisplay:'s = " "',expected:!0}],hints:["Consider using two pointers: one starting from the beginning and one from the end.","Filter out any non-alphanumeric characters before comparing."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers in Place</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain two pointers moving towards the center, skipping non-alphanumeric characters and comparing characters case-insensitively.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `},{id:"valid-parentheses",number:3,title:"Valid Parentheses",difficulty:"Easy",category:"Stack",skill:"JavaScript",acceptance:"41.5%",points:2,description:`
      <p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
      <p class="mt-3">An input string is valid if:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-inkdim">
        <li>Open brackets must be closed by the same type of brackets.</li>
        <li>Open brackets must be closed in the correct order.</li>
        <li>Every close bracket has a corresponding open bracket of the same type.</li>
      </ul>
    `,examples:[{input:'s = "()"',output:"true"},{input:'s = "()[]{}"',output:"true"},{input:'s = "(]"',output:"false"},{input:'s = "([])"',output:"true"}],constraints:["1 <= s.length <= 10<sup>4</sup>","<code>s</code> consists of parentheses only <code>'()[]{}'</code>."],functionName:"isValid",starterCode:{javascript:`/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your code here
  
}`,python:`def isValid(s: str) -> bool:
    # Write your solution here
    pass`,java:`class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`},solutionCode:{javascript:`function isValid(s) {
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
}`,python:`def isValid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,java:`class Solution {
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
}`},sampleTestCases:[{input:["()"],inputDisplay:'s = "()"',expected:!0},{input:["()[]{}"],inputDisplay:'s = "()[]{}"',expected:!0},{input:["(]"],inputDisplay:'s = "(]"',expected:!1},{input:["([])"],inputDisplay:'s = "([])"',expected:!0}],hints:["Use a stack to push open brackets.","When a closing bracket is found, verify it matches the most recent open bracket on top of the stack."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Stack-based evaluation</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">A Stack allows Last-In First-Out (LIFO) pairing of nested opening and closing parentheses.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(N)</div>
    `},{id:"maximum-subarray",number:4,title:"Maximum Subarray",difficulty:"Medium",category:"Dynamic Programming",skill:"Algorithms",acceptance:"50.4%",points:4,description:`
      <p>Given an integer array <code>nums</code>, find the subarray with the largest sum, and return <em>its sum</em>.</p>
      <p class="mt-3">A <strong>subarray</strong> is a contiguous non-empty sequence of elements within an array.</p>
    `,examples:[{input:"nums = [-2,1,-3,4,-1,2,1,-5,4]",output:"6",explanation:"The subarray [4,-1,2,1] has the largest sum 6."},{input:"nums = [1]",output:"1",explanation:"The subarray [1] has the largest sum 1."},{input:"nums = [5,4,-1,7,8]",output:"23",explanation:"The subarray [5,4,-1,7,8] has the largest sum 23."}],constraints:["1 <= nums.length <= 10<sup>5</sup>","-10<sup>4</sup> <= nums[i] <= 10<sup>4</sup>"],functionName:"maxSubArray",starterCode:{javascript:`/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Write your code here (Kadane's Algorithm)
  
}`,python:`def maxSubArray(nums: list[int]) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}`},solutionCode:{javascript:`function maxSubArray(nums) {
  let maxSoFar = nums[0];
  let currentMax = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentMax = Math.max(nums[i], currentMax + nums[i]);
    maxSoFar = Math.max(maxSoFar, currentMax);
  }
  return maxSoFar;
}`,python:`def maxSubArray(nums: list[int]) -> int:
    max_so_far = nums[0]
    current = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        max_so_far = max(max_so_far, current)
    return max_so_far`,java:`class Solution {
    public int maxSubArray(int[] nums) {
        int max = nums[0], current = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            max = Math.max(max, current);
        }
        return max;
    }
}`},sampleTestCases:[{input:[[-2,1,-3,4,-1,2,1,-5,4]],inputDisplay:"nums = [-2,1,-3,4,-1,2,1,-5,4]",expected:6},{input:[[1]],inputDisplay:"nums = [1]",expected:1},{input:[[5,4,-1,7,8]],inputDisplay:"nums = [5,4,-1,7,8]",expected:23}],hints:["Kadane's Algorithm: at each position, decide whether to append to the previous running sum or start fresh."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Kadane's Algorithm</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain a running sum: <code>current = Math.max(nums[i], current + nums[i])</code>. If <code>current</code> dips lower than <code>nums[i]</code>, start a fresh subarray at <code>nums[i]</code>.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `},{id:"container-with-most-water",number:5,title:"Container With Most Water",difficulty:"Medium",category:"Two Pointers",skill:"JavaScript",acceptance:"54.6%",points:4,description:`
      <p>You are given an integer array <code>height</code> of length <code>n</code>. There are <code>n</code> vertical lines drawn such that the two endpoints of the <code>i<sup>th</sup></code> line are <code>(i, 0)</code> and <code>(i, height[i])</code>.</p>
      <p class="mt-3">Find two lines that together with the x-axis form a container, such that the container contains the most water.</p>
      <p class="mt-3">Return <em>the maximum amount of water a container can store</em>.</p>
    `,examples:[{input:"height = [1,8,6,2,5,4,8,3,7]",output:"49",explanation:"The vertical lines are [1,8,6,2,5,4,8,3,7]. The max water is between index 1 and index 8 with area min(8, 7) * (8 - 1) = 49."},{input:"height = [1,1]",output:"1"}],constraints:["n == height.length","2 <= n <= 10<sup>5</sup>","0 <= height[i] <= 10<sup>4</sup>"],functionName:"maxArea",starterCode:{javascript:`/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Write your code here
  
}`,python:`def maxArea(height: list[int]) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int maxArea(int[] height) {
        // Write your solution here
        return 0;
    }
}`},solutionCode:{javascript:`function maxArea(height) {
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
}`,python:`def maxArea(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_w = 0
    while left < right:
        max_w = max(max_w, (right - left) * min(height[left], height[right]))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_w`,java:`class Solution {
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
}`},sampleTestCases:[{input:[[1,8,6,2,5,4,8,3,7]],inputDisplay:"height = [1,8,6,2,5,4,8,3,7]",expected:49},{input:[[1,1]],inputDisplay:"height = [1,1]",expected:1}],hints:["The area is limited by the shorter line.","Moving the pointer with the greater height cannot possibly increase the area, so always move the pointer pointing to the shorter line."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers Greedy</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Starting with maximum width (at opposite ends), contract inward by shifting the smaller boundary towards larger heights.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `},{id:"longest-substring-without-repeating-characters",number:6,title:"Longest Substring Without Repeating Characters",difficulty:"Medium",category:"Sliding Window",skill:"JavaScript",acceptance:"34.5%",points:4,description:`
      <p>Given a string <code>s</code>, find the length of the <strong>longest substring</strong> without repeating characters.</p>
    `,examples:[{input:'s = "abcabcbb"',output:"3",explanation:'The answer is "abc", with the length of 3.'},{input:'s = "bbbbb"',output:"1",explanation:'The answer is "b", with the length of 1.'},{input:'s = "pwwkew"',output:"3",explanation:'The answer is "wke", with the length of 3. Note that the answer must be a substring, "pwke" is a subsequence and not a substring.'}],constraints:["0 <= s.length <= 5 * 10<sup>4</sup>","<code>s</code> consists of English letters, digits, symbols and spaces."],functionName:"lengthOfLongestSubstring",starterCode:{javascript:`/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Write your code here
  
}`,python:`def lengthOfLongestSubstring(s: str) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        return 0;
    }
}`},solutionCode:{javascript:`function lengthOfLongestSubstring(s) {
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
}`,python:`def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    start = 0
    max_len = 0
    for i, c in enumerate(s):
        if c in char_map and char_map[c] >= start:
            start = char_map[c] + 1
        char_map[c] = i
        max_len = max(max_len, i - start + 1)
    return max_len`,java:`class Solution {
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
}`},sampleTestCases:[{input:["abcabcbb"],inputDisplay:'s = "abcabcbb"',expected:3},{input:["bbbbb"],inputDisplay:'s = "bbbbb"',expected:1},{input:["pwwkew"],inputDisplay:'s = "pwwkew"',expected:3}],hints:["Use a sliding window with two pointers representing the current window.","Store each character's last seen index in a hash map to advance the window forward instantly."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Sliding Window with Hash Map</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain window bounds [start, i]. When encountering a repeated character, shift <code>start</code> right past the previous occurrence.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(min(m, n))</div>
    `},{id:"climbing-stairs",number:7,title:"Climbing Stairs",difficulty:"Easy",category:"Dynamic Programming",skill:"Algorithms",acceptance:"52.7%",points:2,description:`
      <p>You are climbing a staircase. It takes <code>n</code> steps to reach the top.</p>
      <p class="mt-3">Each time you can either climb <code>1</code> or <code>2</code> steps. In how many distinct ways can you climb to the top?</p>
    `,examples:[{input:"n = 2",output:"2",explanation:"There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps."},{input:"n = 3",output:"3",explanation:"There are three ways: 1. 1+1+1, 2. 1+2, 3. 2+1."}],constraints:["1 <= n <= 45"],functionName:"climbStairs",starterCode:{javascript:`/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  // Write your code here
  
}`,python:`def climbStairs(n: int) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int climbStairs(int n) {
        // Write your solution here
        return 0;
    }
}`},solutionCode:{javascript:`function climbStairs(n) {
  if (n <= 2) return n;
  let prev1 = 2;
  let prev2 = 1;
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}`,python:`def climbStairs(n: int) -> int:
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`,java:`class Solution {
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
}`},sampleTestCases:[{input:[2],inputDisplay:"n = 2",expected:2},{input:[3],inputDisplay:"n = 3",expected:3},{input:[4],inputDisplay:"n = 4",expected:5}],hints:["To reach step n, you must take 1 step from n-1, or 2 steps from n-2.","Thus, ways(n) = ways(n-1) + ways(n-2). This is the Fibonacci sequence."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Bottom-Up Dynamic Programming</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Notice that reaching step <code>n</code> requires either stepping from <code>n-1</code> or <code>n-2</code>. Only the last two values need to be remembered.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `},{id:"trapping-rain-water",number:8,title:"Trapping Rain Water",difficulty:"Hard",category:"Two Pointers",skill:"Algorithms",acceptance:"60.1%",points:8,description:`
      <p>Given <code>n</code> non-negative integers representing an elevation map where the width of each bar is <code>1</code>, compute how much water it can trap after raining.</p>
    `,examples:[{input:"height = [0,1,0,2,1,0,1,3,2,1,2,1]",output:"6",explanation:"The elevation map [0,1,0,2,1,0,1,3,2,1,2,1] traps 6 units of rain water."},{input:"height = [4,2,0,3,2,5]",output:"9"}],constraints:["n == height.length","1 <= n <= 2 * 10<sup>4</sup>","0 <= height[i] <= 10<sup>5</sup>"],functionName:"trap",starterCode:{javascript:`/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
  // Write your code here
  
}`,python:`def trap(height: list[int]) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int trap(int[] height) {
        // Write your solution here
        return 0;
    }
}`},solutionCode:{javascript:`function trap(height) {
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
}`,python:`def trap(height: list[int]) -> int:
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
    return water`,java:`class Solution {
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
}`},sampleTestCases:[{input:[[0,1,0,2,1,0,1,3,2,1,2,1]],inputDisplay:"height = [0,1,0,2,1,0,1,3,2,1,2,1]",expected:6},{input:[[4,2,0,3,2,5]],inputDisplay:"height = [4,2,0,3,2,5]",expected:9}],hints:["Water trapped at index i is determined by min(max_left, max_right) - height[i].","Can we calculate this in O(1) space with two pointers?"],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Two Pointers O(1) Space</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Maintain <code>leftMax</code> and <code>rightMax</code>. Advance the pointer with smaller height, collecting trapped water.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(N) | Space Complexity: O(1)</div>
    `},{id:"binary-search",number:9,title:"Binary Search",difficulty:"Easy",category:"Binary Search",skill:"Algorithms",acceptance:"57.3%",points:2,description:`
      <p>Given an array of integers <code>nums</code> which is sorted in ascending order, and an integer <code>target</code>, write a function to search <code>target</code> in <code>nums</code>. If <code>target</code> exists, then return its index. Otherwise, return <code>-1</code>.</p>
      <p class="mt-3">You must write an algorithm with <code>O(log n)</code> runtime complexity.</p>
    `,examples:[{input:"nums = [-1,0,3,5,9,12], target = 9",output:"4",explanation:"9 exists in nums and its index is 4"},{input:"nums = [-1,0,3,5,9,12], target = 2",output:"-1",explanation:"2 does not exist in nums so return -1"}],constraints:["1 <= nums.length <= 10<sup>4</sup>","-10<sup>4</sup> < nums[i], target < 10<sup>4</sup>","All the integers in <code>nums</code> are unique.","<code>nums</code> is sorted in ascending order."],functionName:"search",starterCode:{javascript:`/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  // Write your code here
  
}`,python:`def search(nums: list[int], target: int) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`},solutionCode:{javascript:`function search(nums, target) {
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
}`,python:`def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,java:`class Solution {
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
}`},sampleTestCases:[{input:[[-1,0,3,5,9,12],9],inputDisplay:"nums = [-1,0,3,5,9,12], target = 9",expected:4},{input:[[-1,0,3,5,9,12],2],inputDisplay:"nums = [-1,0,3,5,9,12], target = 2",expected:-1}],hints:["Divide and conquer: calculate mid index and adjust boundary accordingly."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Standard Binary Search</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">Halves the search space at each iteration.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(log N) | Space Complexity: O(1)</div>
    `},{id:"coin-change",number:10,title:"Coin Change",difficulty:"Medium",category:"Dynamic Programming",skill:"Algorithms",acceptance:"43.1%",points:4,description:`
      <p>You are given an integer array <code>coins</code> representing coins of different denominations and an integer <code>amount</code> representing a total amount of money.</p>
      <p class="mt-3">Return <em>the fewest number of coins that you need to make up that amount</em>. If that amount of money cannot be made up by any combination of the coins, return <code>-1</code>.</p>
      <p class="mt-3">You may assume that you have an infinite number of each kind of coin.</p>
    `,examples:[{input:"coins = [1,2,5], amount = 11",output:"3",explanation:"11 = 5 + 5 + 1"},{input:"coins = [2], amount = 3",output:"-1"},{input:"coins = [1], amount = 0",output:"0"}],constraints:["1 <= coins.length <= 12","1 <= coins[i] <= 2<sup>31</sup> - 1","0 <= amount <= 10<sup>4</sup>"],functionName:"coinChange",starterCode:{javascript:`/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // Write your code here
  
}`,python:`def coinChange(coins: list[int], amount: int) -> int:
    # Write your solution here
    pass`,java:`class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your solution here
        return -1;
    }
}`},solutionCode:{javascript:`function coinChange(coins, amount) {
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
}`,python:`def coinChange(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,java:`class Solution {
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
}`},sampleTestCases:[{input:[[1,2,5],11],inputDisplay:"coins = [1,2,5], amount = 11",expected:3},{input:[[2],3],inputDisplay:"coins = [2], amount = 3",expected:-1},{input:[[1],0],inputDisplay:"coins = [1], amount = 0",expected:0}],hints:["Use Dynamic Programming where dp[i] is the minimum coins needed to make amount i.","dp[i] = min(dp[i - coin] + 1) for all coin in coins."],editorial:`
      <h3 class="font-display font-semibold text-base text-white mb-2">Bottom-Up DP</h3>
      <p class="text-sm text-inkdim leading-relaxed mb-3">For every sub-amount from 1 up to <code>amount</code>, test each coin denomination and take the minimum.</p>
      <div class="bg-black/40 p-3 rounded-lg font-mono text-xs text-cyan mb-2">Time Complexity: O(S * N) | Space Complexity: O(S) where S is amount</div>
    `},{id:"valid-anagram",number:11,title:"Valid Anagram",difficulty:"Easy",category:"Strings",skill:"Java",acceptance:"62.4%",points:2,description:"<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code>, and <code>false</code> otherwise.</p>",examples:[{input:'s = "anagram", t = "nagaram"',output:"true"}],constraints:["1 <= s.length, t.length <= 5 * 10<sup>4</sup>"],functionName:"isAnagram",starterCode:{javascript:`function isAnagram(s, t) {
  
}`,python:`def isAnagram(s: str, t: str) -> bool:
    pass`,java:`class Solution {
    public boolean isAnagram(String s, String t) {
        return false;
    }
}`},solutionCode:{javascript:`function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (let c of s) count[c] = (count[c] || 0) + 1;
  for (let c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}`,python:`def isAnagram(s: str, t: str) -> bool:
    return sorted(s) == sorted(t)`,java:`class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] c = new int[26];
        for (int i = 0; i < s.length(); i++) {
            c[s.charAt(i) - 'a']++;
            c[t.charAt(i) - 'a']--;
        }
        for (int n : c) if (n != 0) return false;
        return true;
    }
}`},sampleTestCases:[{input:["anagram","nagaram"],inputDisplay:'s = "anagram", t = "nagaram"',expected:!0}]},{id:"reverse-linked-list",number:12,title:"Reverse Linked List",difficulty:"Easy",category:"Linked List",skill:"Java",acceptance:"74.1%",points:2,description:"<p>Given the head of a singly linked list, reverse the list, and return the reversed list.</p>",examples:[{input:"head = [1,2,3,4,5]",output:"[5,4,3,2,1]"}],constraints:["The number of nodes in the list is the range [0, 5000]."],functionName:"reverseList",starterCode:{javascript:`function reverseList(head) {
  
}`,python:`def reverseList(head):
    pass`,java:`class Solution {
    public ListNode reverseList(ListNode head) {
        return null;
    }
}`},solutionCode:{javascript:`function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    let nextTemp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }
  return prev;
}`,python:`def reverseList(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev, curr = curr, nxt
    return prev`,java:`class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode nxt = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nxt;
        }
        return prev;
    }
}`},sampleTestCases:[{input:[[1,2,3,4,5]],inputDisplay:"head = [1,2,3,4,5]",expected:[5,4,3,2,1]}]},{id:"binary-tree-inorder-traversal",number:13,title:"Binary Tree Inorder Traversal",difficulty:"Easy",category:"Trees",skill:"Java",acceptance:"75.2%",points:2,description:"<p>Given the <code>root</code> of a binary tree, return <em>the inorder traversal of its nodes' values</em>.</p>",examples:[{input:"root = [1,null,2,3]",output:"[1,3,2]"}],constraints:["The number of nodes in the tree is in the range [0, 100]."],functionName:"inorderTraversal",starterCode:{javascript:`function inorderTraversal(root) {
  
}`,python:`def inorderTraversal(root):
    pass`,java:`class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        return new ArrayList<>();
    }
}`},solutionCode:{javascript:`function inorderTraversal(root, res = []) {
  if (!root) return res;
  inorderTraversal(root.left, res);
  res.push(root.val);
  inorderTraversal(root.right, res);
  return res;
}`,python:`def inorderTraversal(root):
    res = []
    def helper(node):
        if not node: return
        helper(node.left)
        res.append(node.val)
        helper(node.right)
    helper(root)
    return res`,java:`class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        helper(root, res);
        return res;
    }
    private void helper(TreeNode node, List<Integer> res) {
        if (node == null) return;
        helper(node.left, res);
        res.add(node.val);
        helper(node.right, res);
    }
}`},sampleTestCases:[{input:[[1,null,2,3]],inputDisplay:"root = [1,null,2,3]",expected:[1,3,2]}]},{id:"maximum-depth-of-binary-tree",number:14,title:"Maximum Depth of Binary Tree",difficulty:"Easy",category:"Trees",skill:"Java",acceptance:"74.8%",points:2,description:"<p>Given the <code>root</code> of a binary tree, return <em>its maximum depth</em>.</p>",examples:[{input:"root = [3,9,20,null,null,15,7]",output:"3"}],constraints:["The number of nodes in the tree is in the range [0, 10<sup>4</sup>]."],functionName:"maxDepth",starterCode:{javascript:`function maxDepth(root) {
  
}`,python:`def maxDepth(root):
    pass`,java:`class Solution {
    public int maxDepth(TreeNode root) {
        return 0;
    }
}`},solutionCode:{javascript:`function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,python:`def maxDepth(root):
    if not root: return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,java:`class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}`},sampleTestCases:[{input:[[3,9,20,null,null,15,7]],inputDisplay:"root = [3,9,20,null,null,15,7]",expected:3}]},{id:"intersection-of-two-arrays",number:15,title:"Intersection of Two Arrays",difficulty:"Easy",category:"Arrays & Hashing",skill:"Java",acceptance:"71.3%",points:2,description:"<p>Given two integer arrays <code>nums1</code> and <code>nums2</code>, return <em>an array of their intersection</em>.</p>",examples:[{input:"nums1 = [1,2,2,1], nums2 = [2,2]",output:"[2]"}],constraints:["1 <= nums1.length, nums2.length <= 1000"],functionName:"intersection",starterCode:{javascript:`function intersection(nums1, nums2) {
  
}`,python:`def intersection(nums1: list[int], nums2: list[int]) -> list[int]:
    pass`,java:`class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        return new int[0];
    }
}`},solutionCode:{javascript:`function intersection(nums1, nums2) {
  const set1 = new Set(nums1);
  const set2 = new Set(nums2);
  return [...set1].filter(x => set2.has(x));
}`,python:`def intersection(nums1, nums2):
    return list(set(nums1) & set(nums2))`,java:`class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> set1 = new HashSet<>();
        for (int n : nums1) set1.add(n);
        Set<Integer> set2 = new HashSet<>();
        for (int n : nums2) if (set1.contains(n)) set2.add(n);
        int[] res = new int[set2.size()];
        int i = 0;
        for (int n : set2) res[i++] = n;
        return res;
    }
}`},sampleTestCases:[{input:[[1,2,2,1],[2,2]],inputDisplay:"nums1 = [1,2,2,1], nums2 = [2,2]",expected:[2]}]},{id:"fibonacci-number",number:16,title:"Fibonacci Number",difficulty:"Easy",category:"Math & DP",skill:"JavaScript",acceptance:"72.9%",points:2,description:"<p>The <strong>Fibonacci numbers</strong>, commonly denoted <code>F(n)</code> form a sequence, called the <strong>Fibonacci sequence</strong>, such that each number is the sum of the two preceding ones.</p>",examples:[{input:"n = 4",output:"3",explanation:"F(4) = F(3) + F(2) = 2 + 1 = 3."}],constraints:["0 <= n <= 30"],functionName:"fib",starterCode:{javascript:`function fib(n) {
  
}`,python:`def fib(n: int) -> int:
    pass`,java:`class Solution {
    public int fib(int n) {
        return 0;
    }
}`},solutionCode:{javascript:`function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    let c = a + b;
    a = b;
    b = c;
  }
  return b;
}`,python:`def fib(n):
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b`,java:`class Solution {
    public int fib(int n) {
        if (n <= 1) return n;
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
}`},sampleTestCases:[{input:[4],inputDisplay:"n = 4",expected:3}]},{id:"single-number",number:17,title:"Single Number",difficulty:"Easy",category:"Bit Manipulation",skill:"JavaScript",acceptance:"71.2%",points:2,description:"<p>Given a non-empty array of integers <code>nums</code>, every element appears <em>twice</em> except for one. Find that single one.</p>",examples:[{input:"nums = [2,2,1]",output:"1"}],constraints:["1 <= nums.length <= 3 * 10<sup>4</sup>"],functionName:"singleNumber",starterCode:{javascript:`function singleNumber(nums) {
  
}`,python:`def singleNumber(nums: list[int]) -> int:
    pass`,java:`class Solution {
    public int singleNumber(int[] nums) {
        return 0;
    }
}`},solutionCode:{javascript:`function singleNumber(nums) {
  let res = 0;
  for (let n of nums) res ^= n;
  return res;
}`,python:`def singleNumber(nums):
    res = 0
    for n in nums:
        res ^= n
    return res`,java:`class Solution {
    public int singleNumber(int[] nums) {
        int res = 0;
        for (int n : nums) res ^= n;
        return res;
    }
}`},sampleTestCases:[{input:[[2,2,1]],inputDisplay:"nums = [2,2,1]",expected:1}]},{id:"move-zeroes",number:18,title:"Move Zeroes",difficulty:"Easy",category:"Arrays & Hashing",skill:"JavaScript",acceptance:"61.5%",points:2,description:"<p>Given an integer array <code>nums</code>, move all <code>0</code>'s to the end of it while maintaining the relative order of the non-zero elements.</p>",examples:[{input:"nums = [0,1,0,3,12]",output:"[1,3,12,0,0]"}],constraints:["1 <= nums.length <= 10<sup>4</sup>"],functionName:"moveZeroes",starterCode:{javascript:`function moveZeroes(nums) {
  
}`,python:`def moveZeroes(nums: list[int]) -> None:
    pass`,java:`class Solution {
    public void moveZeroes(int[] nums) {
        
    }
}`},solutionCode:{javascript:`function moveZeroes(nums) {
  let insertPos = 0;
  for (let n of nums) {
    if (n !== 0) nums[insertPos++] = n;
  }
  while (insertPos < nums.length) {
    nums[insertPos++] = 0;
  }
  return nums;
}`,python:`def moveZeroes(nums):
    pos = 0
    for n in nums:
        if n != 0:
            nums[pos] = n
            pos += 1
    while pos < len(nums):
        nums[pos] = 0
        pos += 1
    return nums`,java:`class Solution {
    public void moveZeroes(int[] nums) {
        int pos = 0;
        for (int n : nums) {
            if (n != 0) nums[pos++] = n;
        }
        while (pos < nums.length) {
            nums[pos++] = 0;
        }
    }
}`},sampleTestCases:[{input:[[0,1,0,3,12]],inputDisplay:"nums = [0,1,0,3,12]",expected:[1,3,12,0,0]}]},{id:"plus-one",number:19,title:"Plus One",difficulty:"Easy",category:"Math",skill:"JavaScript",acceptance:"44.2%",points:2,description:"<p>You are given a large integer represented as an integer array <code>digits</code>, where each <code>digits[i]</code> is the i-th digit of the integer. Increment the large integer by one and return <em>the resulting array of digits</em>.</p>",examples:[{input:"digits = [1,2,3]",output:"[1,2,4]"}],constraints:["1 <= digits.length <= 100"],functionName:"plusOne",starterCode:{javascript:`function plusOne(digits) {
  
}`,python:`def plusOne(digits: list[int]) -> list[int]:
    pass`,java:`class Solution {
    public int[] plusOne(int[] digits) {
        return new int[0];
    }
}`},solutionCode:{javascript:`function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] < 9) {
      digits[i]++;
      return digits;
    }
    digits[i] = 0;
  }
  digits.unshift(1);
  return digits;
}`,python:`def plusOne(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits`,java:`class Solution {
    public int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        int[] res = new int[digits.length + 1];
        res[0] = 1;
        return res;
    }
}`},sampleTestCases:[{input:[[1,2,3]],inputDisplay:"digits = [1,2,3]",expected:[1,2,4]}]},{id:"contains-duplicate",number:20,title:"Contains Duplicate",difficulty:"Easy",category:"Arrays & Hashing",skill:"JavaScript",acceptance:"61.1%",points:2,description:"<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears <strong>at least twice</strong> in the array, and return <code>false</code> if every element is distinct.</p>",examples:[{input:"nums = [1,2,3,1]",output:"true"}],constraints:["1 <= nums.length <= 10<sup>5</sup>"],functionName:"containsDuplicate",starterCode:{javascript:`function containsDuplicate(nums) {
  
}`,python:`def containsDuplicate(nums: list[int]) -> bool:
    pass`,java:`class Solution {
    public boolean containsDuplicate(int[] nums) {
        return false;
    }
}`},solutionCode:{javascript:`function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}`,python:`def containsDuplicate(nums):
    return len(set(nums)) != len(nums)`,java:`class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int n : nums) {
            if (!set.add(n)) return true;
        }
        return false;
    }
}`},sampleTestCases:[{input:[[1,2,3,1]],inputDisplay:"nums = [1,2,3,1]",expected:!0}]}],v={SOLVED_KEY:"skillproof_solved_problems",SUBMISSIONS_KEY:"skillproof_problem_submissions",EVIDENCE_KEY:"skillproof_user_evidence",initDefaults(){localStorage.getItem(this.SOLVED_KEY)===null&&localStorage.setItem(this.SOLVED_KEY,JSON.stringify({}))},getSolvedMap(){this.initDefaults();try{const t=localStorage.getItem(this.SOLVED_KEY);return t?JSON.parse(t):{}}catch{return{}}},isSolved(t){return!!this.getSolvedMap()[t]},markSolved(t,e){var r,a;const i=this.getSolvedMap(),n=!!i[t.id];if(i[t.id]={id:t.id,title:t.title,difficulty:t.difficulty,category:t.category,solvedAt:new Date().toISOString(),runtime:e.runtime,memory:e.memory,language:e.language||"JavaScript"},localStorage.setItem(this.SOLVED_KEY,JSON.stringify(i)),this.recordSubmission(t.id,{state:e.state==="VERIFIED"?"VERIFIED":e.state||"LOCAL",serverRecordId:e.serverRecordId||null,status:"Accepted",runtime:e.runtime,memory:e.memory,language:e.language||"JavaScript",code:e.code,timestamp:new Date().toISOString()}),this.logVerifiedSkillProofEvidence(t,e,n),window.SupabaseDB&&typeof window.SupabaseDB.syncProgress=="function"){const s=((a=(r=window.Auth)==null?void 0:r.getUser)==null?void 0:a.call(r))||{email:"local_user"};window.SupabaseDB.syncProgress(s.email,i)}return{wasAlreadySolved:n}},recordSubmission(t,e){try{const i=localStorage.getItem(this.SUBMISSIONS_KEY),n=i?JSON.parse(i):{};n[t]||(n[t]=[]),n[t].unshift(e),n[t].length>15&&(n[t]=n[t].slice(0,15)),localStorage.setItem(this.SUBMISSIONS_KEY,JSON.stringify(n))}catch(i){console.error("Failed to save submission:",i)}},getSubmissions(t){try{const e=localStorage.getItem(this.SUBMISSIONS_KEY);return(e?JSON.parse(e):{})[t]||[]}catch{return[]}},getAllLocalSubmissions(){try{const t=localStorage.getItem(this.SUBMISSIONS_KEY),e=t?JSON.parse(t):{},i=[];for(const[n,r]of Object.entries(e)){if(!Array.isArray(r))continue;const a=u.find(s=>s.id===n);for(const s of r)i.push({problemId:n,problemTitle:s.problemTitle||(a==null?void 0:a.title)||n,difficulty:s.difficulty||(a==null?void 0:a.difficulty)||null,language:s.language||null,status:s.status||null,runtime:s.runtime||null,submittedAt:s.timestamp||s.submittedAt||null})}return i}catch{return[]}},logVerifiedSkillProofEvidence(t,e,i){try{const n=localStorage.getItem(this.EVIDENCE_KEY),r=n?JSON.parse(n):[],a={id:"ev_"+Date.now(),type:"problem",name:t.title,skill:t.skill||"JavaScript",category:t.category,detail:`Solved in ${e.runtime} · ${t.difficulty} · ${t.category}`,timestamp:"Just now",verified:e.state==="VERIFIED"||e.verifiedServerSide===!0,state:e.state||"LOCAL",recordId:e.serverRecordId||e.recordId||null,points:t.points||2};r.unshift(a),localStorage.setItem(this.EVIDENCE_KEY,JSON.stringify(r)),window.dispatchEvent(new CustomEvent("skillproof_evidence_updated",{detail:a}))}catch(n){console.error("Evidence record error:",n)}},async getStats(){const t=this.getSolvedMap(),e=Object.values(t),i=u.length,n=e.length;let r=0,a=0,s=0,l=0,c=0,p=0;u.forEach(o=>{o.difficulty==="Easy"?(r++,t[o.id]&&a++):o.difficulty==="Medium"?(s++,t[o.id]&&l++):o.difficulty==="Hard"&&(c++,t[o.id]&&p++)});const d=i>0?Math.round(n/i*100):0,{computeStreak:h,computePoints:g}=await b(async()=>{const{computeStreak:o,computePoints:x}=await import("./user-stats-DeqBXm8I.js");return{computeStreak:o,computePoints:x}},__vite__mapDeps([0,1,2,3])),m=this.getAllLocalSubmissions(),f=h(m),y=g(m);return{total:i,solvedTotal:n,completionRate:d,easy:{solved:a,total:r},medium:{solved:l,total:s},hard:{solved:p,total:c},streakDays:f,points:y}}},w=u.map(t=>({...t,hiddenTestCases:[]}));window.CODING_PROBLEMS=w;window.ProgressTracker=v;
