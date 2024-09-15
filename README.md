# Websuper

## Overview

This will be a browser-based game of strategy in space, inspired by classic
DOS era strategy games.

## State

Core game mechanics are mostly in place. Still to do are:

1. Everything to do with the enemy, platoons, and combat
2. The scheduled events that happen - disasters, discoveries

The current user interface is a raw sketch with no graphics and not much layout.

Currently every screen (except for the ones I haven't got to yet) is a section on
one big web page. I haven't decided how to do navigation yet. I have put buttons in
the approximate places that they would have been, but none of them are live. I am
thinking I will drop those and have a nav bar across the top, or something like that.
I also want something suitable for phones.

There's enough of a user interface that you can manage planets and ships, except for
moving cargo.

No units or combat.

No message window

A lot of the buttons are placeholders with no functions

Some info is missing (planet details, ships in transit, formatter progress)

## Goals

First goal is a 1-player game entirely in a web page, no server.

Second goal is to run the game engine in Deno, so that...

Third goal is to have a multi-player version: 1v1 or even 2 v computer, or 1v1v1v1

Another idea is to expand the scale of the game beyond the limitations of the
early games that inspired it.
