# Train Station Manager Game - Project Plan & Flow

## Overview

**Title:** Train Station Manager (Working Title)

**Concept:**
You are the manager of a train station. Trains arrive regularly with delivery contracts. Players decide which goods to load onto which train to maximize profit, balance risk, and manage supply. The game is a 3D browser-based strategy game using Three.js.

**Core Goal:**
Make fast, meaningful decisions to deliver goods efficiently and maximize profit, while managing station resources and responding to train demands.

---

## Core Game Loop

1. **Train Arrival**

   * A train enters the station on a 3D track.
   * Each train has:

     * Destination (City A/B/C)
     * Speed
     * Capacity
     * Reward multiplier based on distance

2. **Decision Phase**

   * Train stops at the station.
   * Player chooses which goods to load:

     * Food, Coal, Tech (initial goods)
     * Limited quantities in depot
   * Player has limited time to make decisions (timer displayed).

3. **Train Departure**

   * Train leaves station after decision or if time runs out.
   * Player gains money based on goods loaded and value.
   * Consequences:

     * Missed goods = lost profit
     * Overloaded train = max capacity applied

4. **Spawn Next Train**

   * A new train enters the scene from a random start point.
   * Train speed and capacity vary.

5. **Depot Management**

   * Depot holds limited quantities of goods.
   * Player must manage stock and decide which goods to prioritize.
   * Optional future mechanics:

     * Replenishing depot
     * Dynamic demand (price changes based on supply/demand)

6. **Progression & Scaling**

   * Initially: 1 station, 1 train type, basic goods.
   * Later:

     * Multiple train types (fast, slow, higher capacity)
     * Additional goods
     * Multiple destinations with risk/reward tradeoffs
     * Reputation system affecting contract availability and payouts

---

## 3D Game Representation

* **Station:** Cylinder in 3D space, central point of player decisions.
* **Train:** Box/rectangular 3D object moving along a track.
* **Tracks:** Flat plane or thin boxes for rails.
* **Camera:** Isometric/fixed view to give full station overview.
* **Lighting:** Directional + ambient light for depth.
* **UI Overlay:** HTML elements showing depot, money, train info, and decisions.

---

## Controls

* `1`, `2`, `3` keys to load goods onto the train during the waiting phase.
* Optional future upgrades:

  * Mouse selection of goods
  * Drag & drop to assign cargo

---

## Key Mechanics & Design Principles

1. **Fast Decisions:**

   * Short timers keep players engaged.

2. **Risk/Reward:**

   * Longer routes = higher payouts, potential delays.
   * Short routes = safe, lower payouts.

3. **Progression:**

   * Unlock new goods, train types, and destinations.

4. **Resource Management:**

   * Limited depot stock forces prioritization.

5. **Visual Clarity:**

   * Simple 3D shapes (cylinder, boxes) for clarity and performance.
   * Smooth animations to make game feel alive.

6. **Scoring & Economy:**

   * Money earned from successful deliveries.
   * Optional: reputation, penalties, bonuses.

---

## Future Enhancements

* Curved tracks and multiple station layouts
* Train schedules & simultaneous multiple trains
* Dynamic pricing based on demand
* Import actual 3D train models for visual polish
* Mobile support via wrappers (Capacitor / Cordova)
* More advanced physics or collision detection for realism
* Full UI/UX polish for production-ready release

---

## MVP for V1

* One station (cylinder)
* One train type (box)
* Simple depot with 3 goods
* Arrival → decision → departure loop
* Money scoring system
* Keyboard input for loading goods
* 3D camera view and lighting using Three.js

---

## Summary

This project combines **strategy**, **resource management**, and **fast decision-making** into a visually simple but engaging 3D browser game. The game can scale up from a minimal prototype to a complex system with multiple trains, stations, and dynamic economy while keeping core mechanics intact.
