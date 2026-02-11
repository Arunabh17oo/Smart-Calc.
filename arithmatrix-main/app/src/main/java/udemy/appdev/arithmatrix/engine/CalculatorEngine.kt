package udemy.appdev.arithmatrix.engine

import java.util.Stack

class CalculatorEngine {

    fun evaluate(expression: String): Double {
        val sanitized = expression.replace("x","*").replace("÷","/")
        return evaluateExpression(sanitized)
    }

    private fun evaluateExpression(expression: String): Double{
        val values = Stack<Double>()
        val ops = Stack<Char>()
        var i=0

        while(i < expression.length) {
            val c = expression[i]
            when {
                c.isDigit() || c == '.' -> {
                    val sb = StringBuilder()
                    while (i < expression.length && (expression[i].isDigit() || expression[i] == '.')) {
                        sb.append(expression[i])
                        i++
                    }
                    values.push(sb.toString().toDouble())
                    i--
                }

                c == '+' || c == '-' || c == '*' || c == '/' -> {
                    while (ops.isNotEmpty() && hasPrecedence(c, ops.peek())) {
                        values.push(applyOps(ops.pop(), values.pop(), values.pop()))
                    }
                    ops.push(c)
                }

                c == '%' -> {
                    if (values.isNotEmpty()) {
                        val num = values.pop()
                        val percentBase =
                            if (ops.isNotEmpty() && (ops.peek() == '+' || ops.peek() == '-')) {
                                if (values.isNotEmpty()) values.peek()
                                else num
                            } else {
                                1.0
                            }
                        values.push(num * percentBase / 100.0)
                    }
                }
            }
            i++
        }
            while(ops.isNotEmpty()){
                values.push(applyOps(ops.pop(), values.pop(), values.pop()))
            }


        return values.pop()
    }

    private fun hasPrecedence(op1: Char, op2: Char): Boolean {
        if ((op1 == '*' || op1 == '/') && (op2 == '+' || op2 == '-')) return false
        return true
    }

    private fun applyOps(op: Char, b: Double, a: Double): Double{
        return when(op){
            '+' -> a+b
            '-' -> a-b
            '*' -> a*b
            '/' -> a/b
            else -> 0.0
        }
    }
}