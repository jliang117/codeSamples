
END_CHAR = '*'

def makeTrie(words):
  root = dict()
  for word in words:
    temp = root
    for letter in word:
      temp = temp.setdefault(letter,{})
    temp[END_CHAR] = END_CHAR
  return root

def findKey(trie, key):
  subTrie = trie
  for letter in key:
    if letter in subTrie:
      # we found a match, keep going down
      subTrie = subTrie[letter]
    else:
      return False
  else:
    if END_CHAR in subTrie:
      return True
    return False
    

def insertKey(trie,key):
  if findKey(trie,key):
    return trie
  subTrie = trie
  for letter in key:
    if letter in subTrie:
      subTrie = subTrie[letter]
    else:
      subTrie = subTrie.setdefault(letter,{})
  subTrie[END_CHAR] = END_CHAR
  return trie

