package main

func calculateTotal(price int, quantity int) int {
    return price * quantity
}

type Calculator struct{}

func (c Calculator) Add(a int, b int) int {
    return a + b
}
