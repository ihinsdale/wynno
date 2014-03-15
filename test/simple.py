from __future__ import with_statement
with open('conditionsPseudoTestHTMLPretty.html', 'w') as out_file:
    with open('conditionsPseudoTestHTML.html', 'r') as in_file:
        for line in in_file:
            out_file.write('<p>' + line.rstrip('\n') + '</p>' + '\n')